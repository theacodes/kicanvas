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

export function extension(path: string) {
    return path.split(".").at(-1) ?? "";
}
