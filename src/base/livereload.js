/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/* globals DEBUG */
// @ts-expect-error: defined by esbuild
if (DEBUG) {
    new EventSource("/esbuild").addEventListener("change", () =>
        location.reload(),
    );
}
