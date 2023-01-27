/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { bundle } from "./bundle.js";

let { options, context } = await bundle({
    outfile: "www/kicanvas/kicanvas.js",
    sourcemap: true,
});

await context.watch();

let { host, port } = await context.serve({
    servedir: "./www",
});

console.log(`Watching and building to ${options.outdir}`);
console.log(`Serving at http://${host}:${port}`);
