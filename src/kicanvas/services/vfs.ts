/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { initiate_download } from "../../base/dom/download";
import { basename } from "../../base/paths";

/**
 * Virtual file system interface.
 *
 * This is the interface used by <kc-kicanvas-shell> to find and load files.
 * It's implemented using Drag and Drop and GitHub to provide a common interface
 * for interacting and loading files.
 */
export interface IFileSystem {
    /**
     * List all files in the file system
     */
    list(): Generator<string>;

    /**
     * Get a file from the file system
     */
    get(name: string): Promise<File>;

    /**
     * Return true if current file list has `name`
     */
    has(name: string): Promise<boolean>;

    /**
     * Download a file from the file system. This is used by the "Download" button
     */
    download(name: string): Promise<void>;
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
 * Virtual file system for URLs via Fetch
 */
export class FetchFileSystem implements IFileSystem {
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
        this.resolver = resolve_file ?? this.#default_resolver;

        for (const item of urls) {
            this.#resolve(item);
        }
    }

    *list() {
        yield* this.urls.keys();
    }

    async has(name: string) {
        return Promise.resolve(this.urls.has(name));
    }

    async get(name: string): Promise<File> {
        const url = this.#resolve(name);

        if (!url) {
            throw new Error(`File ${name} not found!`);
        }

        const request = new Request(url, { method: "GET" });
        const response = await fetch(request);

        if (!response.ok) {
            throw new Error(
                `Unable to load ${url}: ${response.status} ${response.statusText}`,
            );
        }

        const blob = await response.blob();

        return new File([blob], name);
    }

    async download(name: string) {
        initiate_download(await this.get(name));
    }
}

/**
 * Virtual file system for HTML drag and drop (DataTransfer)
 */
export class DragAndDropFileSystem implements IFileSystem {
    constructor(private items: FileSystemFileEntry[]) {}

    static async fromDataTransfer(dt: DataTransfer) {
        let items: FileSystemEntry[] = [];

        // Pluck items out as webkit entries (either FileSystemFileEntry or
        // FileSystemDirectoryEntry)
        for (let i = 0; i < dt.items.length; i++) {
            const item = dt.items[i]?.webkitGetAsEntry();
            if (item) {
                items.push(item);
            }
        }

        // If it's just one directory then open it and set all of our items
        // to its contents.
        if (items.length == 1 && items[0]?.isDirectory) {
            const reader = (
                items[0] as FileSystemDirectoryEntry
            ).createReader();

            items = [];

            await new Promise((resolve, reject) => {
                reader.readEntries((entries) => {
                    for (const entry of entries) {
                        if (!entry.isFile) {
                            continue;
                        }
                        items.push(entry);
                    }
                    resolve(true);
                }, reject);
            });
        }

        return new DragAndDropFileSystem(items as FileSystemFileEntry[]);
    }

    *list() {
        for (const entry of this.items) {
            yield entry.name;
        }
    }

    async has(name: string): Promise<boolean> {
        for (const entry of this.items) {
            if (entry.name == name) {
                return true;
            }
        }
        return false;
    }

    async get(name: string): Promise<File> {
        let file_entry: FileSystemFileEntry | null = null;
        for (const entry of this.items) {
            if (entry.name == name) {
                file_entry = entry;
                break;
            }
        }

        if (file_entry == null) {
            throw new Error(`File ${name} not found!`);
        }

        return await new Promise((resolve, reject) => {
            file_entry!.file(resolve, reject);
        });
    }

    async download(name: string) {
        initiate_download(await this.get(name));
    }
}

/**
 * Virtual file system for local files
 */
export class LocalFileSystem implements IFileSystem {
    constructor(private files: File[]) {}

    *list() {
        for (const entry of this.files) {
            yield entry.name;
        }
    }

    async has(name: string): Promise<boolean> {
        return this.files.find((f) => f.name == name) !== undefined;
    }

    async get(name: string): Promise<File> {
        const file = this.files.find((f) => f.name == name);
        if (file) {
            return file;
        } else {
            throw new Error(`File ${name} not found`);
        }
    }

    async download(name: string) {
        initiate_download(await this.get(name));
    }
}
