/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
import { base64_decode } from "../../base/base64";
import { based_on, normalize_join } from "../../base/paths";
import {
    Codeberg,
    CodebergRepoInfo,
    GetBlobResponse,
    RepoContentResponse,
} from "./codeberg";
import { FileEntry, FileSystemBase } from "./vfs";

export class CodebergFileSystem extends FileSystemBase {
    private download_urls: Map<string, URL> = new Map();

    constructor(private repo: CodebergRepoInfo) {
        super();
    }

    async load_file(path: string): Promise<File> {
        const url = this.download_urls.get(path);
        if (!url) {
            throw new Error(`File ${path} not found.`);
        }

        // API: https://codeberg.org/api/swagger#/repository/GetBlob
        const blob = await Codeberg.request_json<GetBlobResponse>(url.pathname);

        if (blob.content.length === 0) {
            throw new Error(`Blob returns empty when loading file ${path}`);
        }

        if (blob.encoding !== "base64") {
            throw new Error(`Unsupported encoding: ${blob.encoding}`);
        }

        const content = base64_decode(blob.content);
        const file = new File([content], path);

        return file;
    }

    async enumerate(cur_path: string): Promise<FileEntry[]> {
        // API:
        // https://codeberg.org/api/swagger#/repository/repoGetContents
        const info = this.repo;
        const base_dir = info.path;
        const base_api = `repos/${info.owner}/${info.repo}/contents`;
        const api_url = normalize_join(base_api, base_dir, cur_path);

        let files = await Codeberg.request_json<
            RepoContentResponse | RepoContentResponse[]
        >(api_url);

        if (!Array.isArray(files)) {
            files = [files];
        }

        const result: FileEntry[] = [];
        for (const it of files) {
            if (
                it.type === "file" &&
                CodebergFileSystem.is_kicad_file(it.name)
            ) {
                const file_path = based_on(base_dir, it.path);

                this.download_urls.set(file_path, new URL(it.git_url));

                result.push({
                    type: "file",
                    path: file_path,
                });
            } else if (it.type === "dir") {
                result.push({
                    type: "directory",
                    path: based_on(base_dir, it.path),
                });
            }
        }

        return result;
    }

    public static async fromURLs(
        url: string | URL,
    ): Promise<CodebergFileSystem | null> {
        const info = Codeberg.parse_url(url);
        if (!info) {
            return null;
        }

        return new CodebergFileSystem(info);
    }
}
