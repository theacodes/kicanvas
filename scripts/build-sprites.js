/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as fs from "node:fs/promises";
import { resolve, basename } from "node:path";
import svgstore from "svgstore";

const ICON_SRC_DIR = resolve("src/kicanvas/icons");
const OUT_FILE = resolve("src/kicanvas/icons/sprites.svg");

const sprites = svgstore({
    cleanDefs: true,
    cleanSymbols: true,
});

for (const filename of await fs.readdir(ICON_SRC_DIR)) {
    if (!filename.endsWith(".svg") || filename == "sprites.svg") {
        continue;
    }

    const name = basename(filename, ".svg");

    sprites.add(
        name,
        await fs.readFile(resolve(ICON_SRC_DIR, filename), "utf-8"),
    );

    console.log(`- ${name}: ${filename}`);
}

await fs.writeFile(OUT_FILE, sprites.toString());
