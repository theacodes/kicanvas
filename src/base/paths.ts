/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export function dirname(path: string | URL) {
    if (path instanceof URL) {
        path = path.pathname;
    }
    return path.split("/").slice(0, -1).join("/");
}

export function basename(path: string | URL) {
    if (path instanceof URL) {
        path = path.pathname;
    }
    return path.split("/").at(-1)!;
}

export function extension(path: string): string {
    const res = path.split(".");
    if (res.length <= 1) {
        return "";
    }
    return res.at(-1)!;
}

/**
 * Path.join and normalize the result,
 * It DOES NOT check relative path or absolute path.
 * + `('', '/qwq')` -> `qwq`
 * + `('///', '/qwq/', 'file')` -> `qwq/file`
 */
export function normalize_join(...parts: string[]): string {
    return parts
        .flatMap((p) => p.split("/"))
        .filter((s) => s !== "")
        .join("/");
}

/**
 * Return relative path of `absolute` based on `parent`.
 * + `('qwq/abc', 'qwq/abc/def/file')` -> `def/file`
 */
export function based_on(parent: string, absolute: string): string {
    if (parent === absolute) {
        return "";
    }
    const base = normalize_join(parent);
    const prefix = base.length > 0 ? base + "/" : "";
    return absolute.startsWith(prefix)
        ? absolute.slice(prefix.length)
        : absolute;
}
