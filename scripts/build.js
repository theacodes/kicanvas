/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import fs from "node:fs";
import { bundle } from "./bundle.js";

let { options, context } = await bundle({
    outfile: "build/kicanvas.js",
    minify: true,
    metafile: true,
});

console.log(`Building to ${options.outfile}`);
let result = await context.rebuild();

console.log(`Build complete!`);
console.log(`${result.warnings.length} warnings`);
for (const msg of result.warnings) {
    console.log("- ", msg);
}
console.log(`${result.errors.length} errors`);
for (const msg of result.errors) {
    console.log("- ", msg);
}

console.log("Saving metafile to build/esbuild-meta.json");
fs.writeFileSync("build/esbuild-meta.json", JSON.stringify(result.metafile));

context.dispose();
