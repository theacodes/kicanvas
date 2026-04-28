/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { basename } from "../../base/paths";
import { is_array } from "../../base/types";
import { request_error_handler } from "./api-error";

export class GitHubURLInfo {
    owner: string;
    repo: string;
    type: string;
    ref?: string;
    path?: string;
}

export class GithubContentResponse {
    download_url: string;
    git_url: string;
    html_url: string;
    name: string;
    path: string;
    sha: string;
    size: number;
    type: string;
    url: string;
}

export class GitHub {
    static readonly host_name = "github.com";
    static readonly html_base_url = "https://github.com";
    static readonly base_url = "https://api.github.com/";
    static readonly api_version = "2022-11-28";
    static readonly accept_header = "application/vnd.github+json";

    headers: Record<string, string>;
    last_response?: Response;
    rate_limit_remaining?: number;

    constructor() {
        this.headers = {
            Accept: GitHub.accept_header,
            "X-GitHub-Api-Version": GitHub.api_version,
        };
    }

    /**
     * Parse an html (user-facing) URL
     */
    static parse_url(url: string | URL): GitHubURLInfo | null {
        url = new URL(url, GitHub.html_base_url);
        if (url.hostname != GitHub.host_name) {
            return null;
        }

        const path_parts = url.pathname.split("/").map((s) => decodeURI(s));

        if (path_parts.length < 3) {
            return null;
        }

        const [, owner, repo, ...parts] = path_parts;
        if (!owner || !repo) {
            return null;
        }

        let type;
        let ref;
        let path;

        if (parts.length) {
            if (parts[0] == "blob" || parts[0] == "tree") {
                type = parts.shift();
                ref = parts.shift();
                path = parts.join("/");
            }
        } else {
            type = "root";
        }

        if (!type) {
            return null;
        }

        return {
            owner: owner,
            repo: repo,
            type: type,
            ref: ref,
            path: path,
        };
    }

    async request(
        path: string,
        params?: Record<string, string>,
        data?: unknown,
    ): Promise<unknown> {
        const static_this = this.constructor as typeof GitHub;

        const url = new URL(path, static_this.base_url);

        if (params) {
            const url_params = new URLSearchParams(params).toString();
            url.search = `?${url_params}`;
        }

        const request = new Request(url, {
            method: data ? "POST" : "GET",
            headers: this.headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        const response = await fetch(request);
        await request_error_handler(response);

        this.last_response = response;

        this.rate_limit_remaining = parseInt(
            response.headers.get("x-ratelimit-remaining") ?? "",
            10,
        );

        if (
            response.headers.get("content-type") ==
            "application/json; charset=utf-8"
        ) {
            return await response.json();
        } else {
            return await response.text();
        }
    }

    async repos_contents(
        owner: string,
        repo: string,
        path: string,
        ref?: string,
    ) {
        // https://docs.github.com/en/rest/repos/contents
        // <api_base>/repos/{owner}/{repo}/contents/{path}
        const result = await this.request(
            `repos/${owner}/${repo}/contents/${path}`,
            {
                ref: ref ?? "",
            },
        );

        return is_array(result)
            ? (result as GithubContentResponse[])
            : [result as GithubContentResponse];
    }
}

export class GitHubUserContent {
    static readonly base_url = "https://raw.githubusercontent.com/";

    constructor() {}

    async get(url_or_path: string | URL): Promise<File> {
        const url = new URL(url_or_path, GitHubUserContent.base_url);
        const request = new Request(url, { method: "GET" });
        const response = await fetch(request);
        const blob = await response.blob();
        const name = basename(url) ?? "unknown";

        return new File([blob], name);
    }

    /**
     * Converts GitHub UI paths to valid paths for raw.githubusercontent.com.
     *
     * https://github.com/wntrblm/Helium/blob/main/hardware/board/board.kicad_sch
     * becomes
     * https://raw.githubusercontent.com/wntrblm/Helium/main/hardware/board/board.kicad_sch
     */
    convert_url(url: string | URL): URL {
        const u = new URL(url, "https://github.com/");

        if (u.host == "raw.githubusercontent.com") {
            return u;
        }

        const parts = u.pathname.split("/");

        if (parts.length < 4) {
            throw new Error(
                `URL ${url} can't be converted to a raw.githubusercontent.com URL`,
            );
        }

        const [_, user, repo, blob, ref, ...path_parts] = parts;

        if (blob != "blob") {
            throw new Error(
                `URL ${url} can't be converted to a raw.githubusercontent.com URL`,
            );
        }

        const path = [user, repo, ref, ...path_parts].join("/");

        return new URL(path, GitHubUserContent.base_url);
    }
}
