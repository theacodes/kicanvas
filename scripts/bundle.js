/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";
import { resolve } from "path";

export const ENTRY = resolve("src/index.ts");

export async function bundle(options = {}) {
    options = {
        entryPoints: [ENTRY],
        bundle: true,
        format: "esm",
        keepNames: true,
        sourcemap: false,
        loader: {
            ".js": "ts",
            ".glsl": "text",
        },
        plugins: [
            copy({
                assets: [
                    {
                        from: [resolve("src/resources/*")],
                        to: ["resources"],
                    },
                ],
            }),
        ],
        ...options,
    };
    return { options: options, context: await esbuild.context(options) };
}
