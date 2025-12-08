/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { bundle } from "./bundle.js";

let { context } = await bundle({
    outfile: "debug/kicanvas/kicanvas.js",
    sourcemap: true,
    define: {
        DEBUG: "true",
    },
});

await context.watch();

let { hosts, port } = await context.serve({
    servedir: "./debug",
    port: 8001,
});

console.log(`[serve] listening at http://${hosts[0]}:${port}`);
