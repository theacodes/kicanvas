/*
    Copyright (c) 2023 XiangYyang
*/

import { initiate_download } from "../../base/dom/download";
import { basename } from "../../base/paths";
import VirtualFileSystem from "./vfs";
import { Logger } from "../../base/log";

const log = new Logger("kicanvas:fetchfs");

/**
 * File sources
 */
export class FetchFileSource {
    constructor(
        origin: "uri" | "content",
        value: string,
        name: string | undefined = undefined,
    ) {
        this.origin = origin;
        if (this.origin === "uri") {
            const url = new URL(value, window.location.toString());
            this.value = url;
            this.origin_name = name ?? basename(url);
            log.info(
                `Load file from url ${url}, origin name: ${this.origin_name}`,
            );
        } else {
            this.value = value;
            this.origin_name = name ?? "noname";
            log.info(
                `Load file from inline source, origin name: ${this.origin_name}`,
            );
        }
    }

    /**
     * Get the origin name of this item
     */
    public get_origin_name(): string {
        return this.origin_name;
    }

    /**
     * Get the file content from URL or inline sources
     */
    public async get_content(): Promise<File> {
        if (this.origin === "uri") {
            const url = this.value as URL;

            const request = new Request(url, { method: "GET" });

            const response = await fetch(request);

            if (!response.ok) {
                throw new Error(
                    `Unable to load ${url}: ${response.status} ${response.statusText}`,
                );
            }

            const blob = await response.blob();

            return new File([blob], this.origin_name);
        } else {
            const content = this.value as string;
            const blob = new Blob([content], { type: "text/plain" });
            return new File([blob], this.origin_name);
        }
    }

    /**
     * Origin, from URI or from raw content.
     */
    private origin: "uri" | "content";

    /**
     * Value, URL (origin === "uri") or string (origin === "content")
     */
    private value: URL | string;

    /**
     * File name
     */
    private origin_name: string;
}

/**
 * Virtual file system for URLs via Fetch or inline sources
 */
export default class FetchFileSystem extends VirtualFileSystem {
    private items: Map<string, FetchFileSource> = new Map();

    constructor(items: FetchFileSource[]) {
        super();

        for (const item of items) {
            this.items.set(item.get_origin_name(), item);
        }
    }

    public override *list() {
        yield* this.items.keys();
    }

    public override async has(name: string) {
        return Promise.resolve(this.items.has(name));
    }

    public override async get(name: string): Promise<File> {
        const item = this.items.get(name);

        if (!item) {
            throw new Error(`File ${name} not found!`);
        }

        return item.get_content();
    }

    public async download(name: string) {
        initiate_download(await this.get(name));
    }
}
