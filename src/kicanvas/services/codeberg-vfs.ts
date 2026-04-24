/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
import { base64_decode } from "../../base/base64";
import { initiate_download } from "../../base/dom/download";
import { extension } from "../../base/paths";
import { Codeberg, GetBlobResponse, RepoContentResponse } from "./codeberg";
import { type IFileSystem } from "./vfs";

export class CodebergFileSystem implements IFileSystem {
    static readonly kicad_extensions = ["kicad_pcb", "kicad_pro", "kicad_sch"];

    async setup() {}
    constructor(private files_to_urls: Map<string, URL>) {}

    public static async fromURLs(
        url: string | URL,
    ): Promise<CodebergFileSystem | null> {
        const files_to_urls = new Map<string, URL>();

        const info = Codeberg.parse_url(url);
        if (!info) {
            return null;
        }

        // API:
        // https://codeberg.org/api/swagger#/repository/repoGetContents
        const api_url = `repos/${info.owner}/${info.repo}/contents/${info.path}`;

        let files = await Codeberg.request_json<
            RepoContentResponse | RepoContentResponse[]
        >(api_url);

        if (!Array.isArray(files)) {
            files = [files];
        }

        for (const file of files) {
            if (!file.name || !file.git_url || file.type !== "file") {
                continue;
            }

            if (
                !CodebergFileSystem.kicad_extensions.includes(
                    extension(file.name),
                )
            ) {
                continue;
            }

            files_to_urls.set(file.name, new URL(file.git_url));
        }

        if (files_to_urls.size == 0) {
            // no valid URL and files, return null.
            return null;
        }

        return new CodebergFileSystem(files_to_urls);
    }

    *list(): Generator<string> {
        yield* this.files_to_urls.keys();
    }

    async get(name: string) {
        const url = this.files_to_urls.get(name);
        if (!url) {
            throw new Error(`File ${name} not found.`);
        }

        // API: https://codeberg.org/api/swagger#/repository/GetBlob
        const blob = await Codeberg.request_json<GetBlobResponse>(url.pathname);

        if (blob.encoding !== "base64") {
            throw new Error(`Unsupported encoding: ${blob.encoding}`);
        }

        const content = base64_decode(blob.content);
        const file = new File([content], name);

        return file;
    }

    async has(name: string) {
        return Promise.resolve(this.files_to_urls.has(name));
    }

    async download(name: string) {
        initiate_download(await this.get(name));
    }
}
