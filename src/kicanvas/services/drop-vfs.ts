/*
    Copyright (c) 2023 XiangYyang
*/

import { initiate_download } from "../../base/dom/download";
import VirtualFileSystem from "./vfs";

/**
 * Virtual file system for HTML drag and drop (DataTransfer)
 */
export default class DragAndDropFileSystem extends VirtualFileSystem {
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
