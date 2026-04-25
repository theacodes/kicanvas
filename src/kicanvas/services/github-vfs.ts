/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import {
    basename,
    dirname,
    extension,
    normalize_join,
    based_on,
} from "../../base/paths";
import { GitHub, GitHubUserContent, type GitHubURLInfo } from "./github";
import { FileSystemBase, type FileEntry } from "./vfs";

const gh_user_content = new GitHubUserContent();
const gh = new GitHub();

/**
 * Virtual file system for GitHub.
 */
export class GitHubFileSystem extends FileSystemBase {
    private download_urls: Map<string, URL>;

    constructor(
        url: string | URL,
        private gh_repo: GitHubURLInfo,
        private single_file = false,
    ) {
        super();
        this.download_urls = new Map<string, URL>();

        // try using `raw.github` directly for single file
        if (single_file) {
            // Handles URLs like this:
            // https://github.com/wntrblm/Helium/blob/main/hardware/board/board.kicad_sch
            // In single-file mode, just store file basename
            const guc_url = gh_user_content.convert_url(url);
            const name = basename(guc_url);
            this.download_urls.set(name, guc_url);
        }
    }

    override async load_file(path: string): Promise<File> {
        const download_url = this.download_urls.get(path);
        if (!download_url) {
            throw new Error(`File ${path} not found!`);
        }

        return await gh_user_content.get(download_url);
    }

    override async enumerate(cur_dir: string): Promise<FileEntry[]> {
        if (this.single_file) {
            // single file, return all files directly
            return Array.from(this.download_urls.keys()).map((v) => ({
                type: "file",
                path: v,
            }));
        }

        const base_dir = this.gh_repo.path ?? "";
        const full_path = normalize_join(base_dir, cur_dir);

        const contents = await gh.repos_contents(
            this.gh_repo.owner,
            this.gh_repo.repo,
            full_path,
            this.gh_repo.ref,
        );

        const result: FileEntry[] = [];
        for (const it of contents) {
            if (it.type === "file" && GitHubFileSystem.is_kicad_file(it.name)) {
                const file_path = based_on(base_dir, it.path);

                this.download_urls.set(file_path, new URL(it.download_url));

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
    ): Promise<GitHubFileSystem | null> {
        const info = GitHub.parse_url(url);

        if (!info) {
            return null;
        }

        // Link to the root of a repo, treat it as tree using HEAD
        if (info.type == "root") {
            info.ref = "HEAD";
            info.type = "tree";
        }

        // If it's one file just load one file.
        let single_file = false;
        if (info.type === "blob") {
            if (["kicad_sch", "kicad_pcb"].includes(extension(info.path!))) {
                single_file = true;
            } else {
                // Link to non-kicad file, try using the containing directory.
                info.type = "tree";
                info.path = dirname(info.path!);
            }
        }

        return new GitHubFileSystem(url, info, single_file);
    }
}
