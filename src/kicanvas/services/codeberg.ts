/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
import { request_error_handler } from "./api-error";

export class RepoContentResponse {
    name: string;
    path: string;
    type: string;
    sha: string;
    url: string;
    git_url: string;
}

export class GetBlobResponse {
    content: string;
    encoding: string;
    sha: string;
    size: number;
    url: string;
}

export class CodeBerg {
    static readonly host_name = "codeberg.org";
    static readonly html_base_url = "https://codeberg.org/";
    static readonly base_url = "https://codeberg.org/api/v1/";
    static readonly accept_header = "application/json";

    static parse_url(url: string | URL) {
        url = new URL(url, CodeBerg.html_base_url);
        if (url.hostname !== CodeBerg.host_name) {
            return null;
        }

        const path_parts = url.pathname.split("/");

        if (path_parts.length < 3) {
            return null;
        }

        const [, owner, repo, ...parts] = path_parts;

        let ref, path;
        if (parts.length > 0) {
            // owner/repo/src/<commit|branch>/<ref>/<rel_path>
            const typ = parts.shift();
            if (typ !== "src") {
                return null;
            }

            const ref_type = parts.shift();
            if (ref_type !== "commit" && ref_type !== "branch") {
                return null;
            }

            ref = parts.shift();
            if (!ref) {
                return null;
            }

            path = parts.join("/");
        } else {
            // owner/repo
            ref = "main";
            path = ".";
        }

        return {
            owner: owner,
            repo: repo,
            ref: ref,
            path: path,
        };
    }

    static async request(
        path: string,
        params?: Record<string, string>,
        data?: unknown,
    ): Promise<string> {
        const url = new URL(path, CodeBerg.base_url);

        if (params) {
            const url_params = new URLSearchParams(params).toString();
            url.search = `?${url_params}`;
        }

        const request = new Request(url, {
            method: data ? "POST" : "GET",
            headers: {
                Accept: CodeBerg.accept_header,
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        const response = await fetch(request);
        await request_error_handler(response);

        return await response.text();
    }

    static async request_json<T>(
        path: string,
        params?: Record<string, string>,
        data?: unknown,
    ): Promise<T> {
        const text = await CodeBerg.request(path, params, data);
        try {
            return JSON.parse(text) as T;
        } catch (error) {
            throw new Error("Failed to parse JSON response: " + error);
        }
    }
}
