/*
    Copyright (c) 2023 XiangYyang
*/

import { initiate_download } from "../../base/dom/download";
import { basename } from "../../base/paths";
import VirtualFileSystem from "./vfs";

/**
 * Virtual file system for URLs via Fetch or inline sources
 */
export default class FetchFileSystem extends VirtualFileSystem {
    private urls: Map<string, URL> = new Map();

    constructor(urls: (string | URL)[]) {
        super();

        for (const item of urls) {
            const url = new URL(item, window.location.toString());
            const name = basename(url);
            this.urls.set(name, url);
        }
    }

    public override *list() {
        yield* this.urls.keys();
    }

    public override async has(name: string) {
        return Promise.resolve(this.urls.has(name));
    }

    public override async get(name: string): Promise<File> {
        const url = this.urls.get(name);

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
