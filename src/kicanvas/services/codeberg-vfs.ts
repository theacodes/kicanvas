/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
import { base64_decode } from "../../base/base64";
import { initiate_download } from "../../base/dom/download";
import { extension } from "../../base/paths";
import { CodeBerg, GetBlobResponse, RepoContentResponse } from "./codeberg";
import { VirtualFileSystem } from "./vfs";

export class CodeBergFileSystem extends VirtualFileSystem {
    static readonly kicad_extensions = ["kicad_pcb", "kicad_pro", "kicad_sch"];

    constructor(private files_to_urls: Map<string, URL>) {
        super();
    }

    public static async fromURLs(
        ...urls: (string | URL)[]
    ): Promise<CodeBergFileSystem | null> {
        const files_to_urls = new Map<string, URL>();

        for (const url of urls) {
            const info = CodeBerg.parse_url(url);
            if (!info) {
                continue;
            }

            // API:
            // https://codeberg.org/api/swagger#/repository/repoGetContents
            const api_url = `repos/${info.owner}/${info.repo}/contents/${info.path}`;

            let files = await CodeBerg.request_json<
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
                    !CodeBergFileSystem.kicad_extensions.includes(
                        extension(file.name),
                    )
                ) {
                    continue;
                }

                files_to_urls.set(file.name, new URL(file.git_url));
            }
        }

        if (files_to_urls.size == 0) {
            // no valid URL and files, return null.
            return null;
        }

        return new CodeBergFileSystem(files_to_urls);
    }

    override *list(): Generator<string> {
        yield* this.files_to_urls.keys();
    }

    override async get(name: string): Promise<File> {
        const url = this.files_to_urls.get(name);
        if (!url) {
            throw new Error(`File ${name} not found.`);
        }

        // API: https://codeberg.org/api/swagger#/repository/GetBlob
        const blob = await CodeBerg.request_json<GetBlobResponse>(url.pathname);

        if (blob.encoding !== "base64") {
            throw new Error(`Unsupported encoding: ${blob.encoding}`);
        }

        const content = base64_decode(blob.content);
        const file = new File([content], name);

        return file;
    }

    override has(name: string): Promise<boolean> {
        return Promise.resolve(this.files_to_urls.has(name));
    }

    override async download(name: string): Promise<void> {
        initiate_download(await this.get(name));
    }
}
