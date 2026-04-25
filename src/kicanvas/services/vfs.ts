/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { initiate_download } from "../../base/dom/download";
import {
    based_on,
    basename,
    dirname,
    extension,
    normalize_join,
} from "../../base/paths";

/**
 * Virtual file system interface.
 *
 * This is the interface used by <kc-kicanvas-shell> to find and load files.
 * It's implemented using Drag and Drop and GitHub to provide a common interface
 * for interacting and loading files.
 */
export interface IFileSystem {
    /** List all files */
    list(): Generator<string>;

    /** Initialize it */
    setup(): Promise<void>;

    /** Get a file */
    get(path: string): Promise<File>;

    /** Return true if current file list has `path` */
    has(path: string): Promise<boolean>;

    /** Download a file from the file system */
    download(name: string): Promise<void>;
}

/**
 * File entry, directory or file
 */
export class FileEntry {
    path: string;
    type: "file" | "directory";
}

/**
 * File entry, additional type for mark visited items
 */
class FileEntryCache {
    path: string;
    type: "file" | "directory" | "visited-directory";
}

/**
 * File system base
 */
export abstract class FileSystemBase implements IFileSystem {
    // path -> entry
    // e.g.
    //   + root.kicad_pcb
    //   + subdir/
    //     + qwq1.kicad_sch
    //     + qwq2.kicad_sch
    // stored as
    // root.kicad_pcb -> { name: "root.kicad_pcb", type: "file" }
    // subdir -> { name: "subdir", type: "directory" }
    // subdir/qwq1.kicad_sch -> { name: "subdir/qwq1.kicad_sch", type: "file" }
    // subdir/qwq2.kicad_sch -> { name: "subdir/qwq2.kicad_sch", type: "file" }
    private entries: Map<string, FileEntryCache>;

    constructor(entries: Map<string, FileEntry> = new Map()) {
        this.entries = entries;
    }

    *list() {
        for (const [path, entry] of this.entries) {
            if (entry.type === "file") {
                yield path;
            }
        }
    }

    async setup() {
        // load all entries on root directory
        await this.walk("");
    }

    async get(name: string) {
        if (!(await this.has(name))) {
            throw new Error(`File ${name} not found`);
        }

        return await this.load_file(name);
    }

    async has(name: string) {
        const dir = dirname(name);
        if (!this.entries.has(dir) && !this.entries.has(name)) {
            return false;
        }

        // load entries on current directory
        await this.walk(dir);

        // check if the file exists and is a file
        const obj = this.entries.get(name);
        return !!obj && obj.type === "file";
    }

    async download(name: string) {
        initiate_download(await this.get(name));
    }

    /**
     * Return true if a file has extension name `.kicad_pcb`, `.kicad_prj` or `.kicad_sch`
     */
    protected static is_kicad_file(name: string): boolean {
        const exts = ["kicad_pcb", "kicad_pro", "kicad_sch"];

        return exts.includes(extension(name));
    }

    /**
     * Walk through directories and update `this.entries`
     */
    private async walk(dir: string): Promise<void> {
        if (this.entries.get(dir)?.type === "visited-directory") {
            // visited directory, skip it.
            return;
        }

        const entries = await this.enumerate(dir);
        this.entries.set(dir, { path: dir, type: "visited-directory" });

        for (const it of entries) {
            if (it.type === "file" && !FileSystemBase.is_kicad_file(it.path)) {
                continue;
            }
            this.entries.set(it.path, it);
        }
    }

    /**
     * Load file from implementation-specific source
     */
    protected abstract load_file(path: string): Promise<File>;

    /**
     * Enumerate files at `base_dir`. (default: empty)
     */
    protected abstract enumerate(base_dir: string): Promise<FileEntry[]>;
}

/**
 * Merge two virtual file systems into one
 */
export class MergedFileSystem implements IFileSystem {
    private fs_list: IFileSystem[];

    constructor(fs: (IFileSystem | null)[]) {
        this.fs_list = fs.filter((f) => f !== null);
    }

    *list() {
        for (const fs of this.fs_list) {
            yield* fs.list();
        }
    }

    async setup() {
        for (const fs of this.fs_list) {
            await fs.setup();
        }
    }

    async has(name: string): Promise<boolean> {
        for (const fs of this.fs_list) {
            if (await fs.has(name)) {
                return true;
            }
        }

        return false;
    }

    async get(name: string): Promise<File> {
        for (const fs of this.fs_list) {
            if (await fs.has(name)) {
                return await fs.get(name);
            }
        }

        throw new Error(`File ${name} not found`);
    }

    async download(name: string) {
        for (const fs of this.fs_list) {
            if (await fs.has(name)) {
                return await fs.download(name);
            }
        }

        throw new Error(`File ${name} not found`);
    }
}

/**
 * Local file system base class, with a file list provided by the constructor.
 */
export class LocalFileSystemBase extends FileSystemBase {
    constructor(private file_list: Map<string, File>) {
        super(LocalFileSystemBase.into_entries(file_list));
    }

    async load_file(path: string): Promise<File> {
        const file = this.file_list.get(path);

        if (!file) {
            throw new Error(`File ${path} not found!`);
        }

        return file;
    }

    async enumerate(base_dir: string): Promise<FileEntry[]> {
        // All files are already provided by the constructor.
        return [];
    }

    private static into_entries(files: Map<string, File>) {
        const result = new Map<string, FileEntry>();

        for (const path of files.keys()) {
            result.set(path, { path: path, type: "file" });
        }

        return result;
    }
}

/**
 * Virtual file system for URLs via Fetch
 */
export class FetchFileSystem extends FileSystemBase {
    private urls: Map<string, URL> = new Map();
    private resolver!: (name: string) => URL;

    #default_resolver(name: string): URL {
        const url = new URL(name, window.location.toString());
        return url;
    }

    #resolve(filepath: string | URL): URL {
        if (typeof filepath === "string") {
            const cached_url = this.urls.get(filepath);
            if (cached_url) {
                return cached_url;
            } else {
                const url = this.resolver(filepath);
                const name = basename(url);
                this.urls.set(name, url);
                return url;
            }
        }
        return filepath;
    }

    constructor(
        urls: (string | URL)[],
        resolve_file: ((name: string) => URL) | null = null,
    ) {
        super();

        this.resolver = resolve_file ?? this.#default_resolver;

        for (const item of urls) {
            this.#resolve(item);
        }
    }

    async load_file(path: string): Promise<File> {
        const url = this.#resolve(path);

        if (!url) {
            throw new Error(`File ${path} not found!`);
        }

        const request = new Request(url, { method: "GET" });
        const response = await fetch(request);

        if (!response.ok) {
            throw new Error(
                `Unable to load ${url}: ${response.status} ${response.statusText}`,
            );
        }

        const blob = await response.blob();

        return new File([blob], path);
    }

    async enumerate(base_dir: string): Promise<FileEntry[]> {
        return Array.from(this.urls.keys()).map((path) => ({
            path,
            type: "file",
        }));
    }
}

/**
 * Virtual file system for HTML drag and drop (DataTransfer)
 */
export class DragAndDropFileSystem extends LocalFileSystemBase {
    static async fromDataTransfer(dt: DataTransfer) {
        const items: FileSystemEntry[] = [];

        // Pluck items out as webkit entries (either FileSystemFileEntry or
        // FileSystemDirectoryEntry)
        for (let i = 0; i < dt.items.length; i++) {
            const item = dt.items[i]?.webkitGetAsEntry();
            if (item) {
                items.push(item);
            }
        }

        // walk through directories and collect all file entries
        const files = await DragAndDropFileSystem.walk(items);

        // load kicad files
        const file_map = new Map<string, File>();
        for (const entry of files) {
            if (
                entry.isFile &&
                DragAndDropFileSystem.is_kicad_file(entry.name)
            ) {
                const file = await DragAndDropFileSystem.load(entry);
                file_map.set(normalize_join(entry.fullPath), file);
            }
        }

        // TODO: more than one kicad_pro loaded???

        // deduce the common base directory
        const lcp = DragAndDropFileSystem.lcp(Array.from(file_map.keys()));
        const res = new Map(
            [...file_map].map(([p, f]) => [based_on(lcp, p), f]),
        );

        return new DragAndDropFileSystem(res);
    }

    private static lcp(str: string[]): string {
        const beg = str[0] ?? "";
        return str.reduce((common, path) => {
            let i = 0;

            while (
                i < common.length &&
                i < path.length &&
                common[i] === path[i]
            ) {
                i += 1;
            }

            return common.slice(0, i);
        }, beg);
    }

    private static async load(entry: FileSystemFileEntry): Promise<File> {
        return await new Promise((resolve, reject) => {
            entry.file(resolve, reject);
        });
    }

    private static async walk(items: FileSystemEntry[]) {
        const files: FileSystemFileEntry[] = [];

        while (items.length > 0) {
            const item = items.pop()!;
            if (item.isFile) {
                files.push(item as FileSystemFileEntry);
            } else if (item.isDirectory) {
                const reader = (
                    item as FileSystemDirectoryEntry
                ).createReader();

                await new Promise((resolve, reject) => {
                    reader.readEntries((entries) => {
                        for (const entry of entries) {
                            if (entry.isFile) {
                                files.push(entry as FileSystemFileEntry);
                            } else if (entry.isDirectory) {
                                items.push(entry);
                            }
                        }
                        resolve(true);
                    }, reject);
                });
            }
        }

        return files;
    }
}

/**
 * Virtual file system for local files
 */
export class LocalFileSystem extends LocalFileSystemBase {
    constructor(files: File[]) {
        super(new Map(files.map((f) => [f.name, f])));
    }
}
