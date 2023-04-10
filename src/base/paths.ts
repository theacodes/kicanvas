/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export function basename(path: string | URL) {
    return new URL(path).pathname.split("/").at(-1)!;
}

export function extension(path: string) {
    return path.split(".").at(-1) ?? "";
}
