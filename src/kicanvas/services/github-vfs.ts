/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { initiate_download } from "../../base/dom/download";
import { basename, dirname, extension } from "../../base/paths";
import { GitHub, GitHubUserContent } from "./github";
import VirtualFileSystem from "./vfs";

const kicad_extensions = ["kicad_pcb", "kicad_pro", "kicad_sch"];
const gh_user_content = new GitHubUserContent();
const gh = new GitHub();

/**
 * Virtual file system for GitHub.
 */
export class GitHubFileSystem extends VirtualFileSystem {
    constructor(private files_to_urls: Map<string, URL>) {
        super();
    }

    public static async fromURLs(...urls: (string | URL)[]) {
        // Handles URLs like this:
        // https://github.com/wntrblm/Helium/blob/main/hardware/board/board.kicad_sch

        const files_to_urls = new Map();

        for (const url of urls) {
            const info = GitHub.parse_url(url);

            if (!info || !info.owner || !info.repo) {
                continue;
            }

            // Link to the root of a repo, treat it as tree using HEAD
            if (info.type == "root") {
                info.ref = "HEAD";
                info.type = "tree";
            }

            // Link to a single file.
            if (info.type == "blob") {
                if (
                    ["kicad_sch", "kicad_pcb"].includes(extension(info.path!))
                ) {
                    const guc_url = gh_user_content.convert_url(url);
                    const name = basename(guc_url);
                    files_to_urls.set(name, guc_url);
                } else {
                    // Link to non-kicad file, try using the containing directory.
                    info.type = "tree";
                    info.path = dirname(info.path!);
                }
            }

            // Link to a directory.
            if (info.type == "tree") {
                // Get a list of files in the directory.
                const gh_file_list = (await gh.repos_contents(
                    info.owner,
                    info.repo,
                    info.path ?? "",
                    info.ref,
                )) as Record<string, string>[];

                for (const gh_file of gh_file_list) {
                    const name = gh_file["name"];
                    const download_url = gh_file["download_url"];
                    if (
                        !name ||
                        !download_url ||
                        !kicad_extensions.includes(extension(name))
                    ) {
                        continue;
                    }

                    files_to_urls.set(name, download_url);
                }
            }
        }

        return new GitHubFileSystem(files_to_urls);
    }

    public override *list() {
        yield* this.files_to_urls.keys();
    }

    public override get(name: string): Promise<File> {
        const url = this.files_to_urls.get(name);

        if (!url) {
            throw new Error(`File ${name} not found!`);
        }

        return gh_user_content.get(url);
    }

    public override has(name: string) {
        return Promise.resolve(this.files_to_urls.has(name));
    }

    public override async download(name: string) {
        // Note: we can't just use the GitHub URL to download since the anchor
        // tag method used by initiate_download() only works for same-origin
        // or data: urls, so this actually fetch()s the file and then initiates
        // the download.
        initiate_download(await this.get(name));
    }
}
