/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import esbuild from "esbuild";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

export const ENTRY = resolve("src/index.ts");

export async function bundle(options = {}) {
    options = {
        entryPoints: [ENTRY],
        bundle: true,
        format: "esm",
        target: "es2022",
        keepNames: true,
        sourcemap: false,
        loader: {
            ".js": "ts",
            ".glsl": "text",
            ".css": "text",
            ".svg": "text",
            ".kicad_wks": "text",
        },
        plugins: [CSSMinifyPlugin],
        ...options,
    };
    return { options: options, context: await esbuild.context(options) };
}

// Minify CSS when used with the file loader.
export const CSSMinifyPlugin = {
    name: "CSSMinifyPlugin",
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
            const f = await readFile(args.path);
            const css = await esbuild.transform(f, {
                loader: "css",
                minify: true,
            });
            return { loader: "text", contents: css.code };
        });
    },
};
