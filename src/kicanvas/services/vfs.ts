/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { initiate_download } from "../../base/dom/download";
import { basename } from "../../base/paths";

/**
 * Virtual file system abstract class.
 *
 * This is the interface used by <kc-kicanvas-shell> to find and load files.
 * It's implemented using Drag and Drop and GitHub to provide a common interface
 * for interacting and loading files.
 */
export abstract class VirtualFileSystem {
    public abstract list(): Generator<string>;
    public abstract get(name: string): Promise<File>;
    public abstract has(name: string): Promise<boolean>;
    public abstract download(name: string): Promise<void>;

    public *list_matches(r: RegExp) {
        for (const filename of this.list()) {
            if (filename.match(r)) {
                yield filename;
            }
        }
    }

    public *list_ext(ext: string) {
        if (!ext.startsWith(".")) {
            ext = `.${ext}`;
        }

        for (const filename of this.list()) {
            if (filename.endsWith(ext)) {
                yield filename;
            }
        }
    }
}

/**
 * Virtual file system for URLs via Fetch
 */
export class FetchFileSystem extends VirtualFileSystem {
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

    public override *list() {
        yield* this.urls.keys();
    }

    public override async has(name: string) {
        return Promise.resolve(this.urls.has(name));
    }

    public override async get(name: string): Promise<File> {
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

    public async download(name: string) {
        initiate_download(await this.get(name));
    }
}

/**
 * Virtual file system for HTML drag and drop (DataTransfer)
 */
export class DragAndDropFileSystem extends VirtualFileSystem {
    constructor(private items: FileSystemFileEntry[]) {
        super();
    }

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

    public override *list() {
        for (const entry of this.items) {
            yield entry.name;
        }
    }

    public override async has(name: string): Promise<boolean> {
        for (const entry of this.items) {
            if (entry.name == name) {
                return true;
            }
        }
        return false;
    }

    public override async get(name: string): Promise<File> {
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

    public async download(name: string) {
        initiate_download(await this.get(name));
    }
}
