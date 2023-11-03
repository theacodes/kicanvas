/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Transforms KiCAD's newstroke font into a format KiCanvas can use.
 *
 * Newstroke is distributed as a .cpp file and a old-format KiCAD library,
 * this script transforms it into a .ts file so it can be easily imported
 * into KiCanvas
 *
 * Note: Newstroke is *huge*, nearly 3MB! This is massive compared to the rest
 * of KiCanvas, so we have to do some optimization. The vast bulk of Newstroke
 * is the extended CJK character set (Unicode 0x4E00-0x9FFF). There aren't a lot
 * of open source schematics/boards that use those characters so this script
 * removes them, reducing the size from ~3MB to ~200kB. In the future, it
 * should be possible to separately load those symbols when needed.
 *
 */

import * as fs from "node:fs/promises";

const INFILE = "./third_party/newstroke/newstroke_font.cpp";
const OUTFILE = "./src/kicad/text/newstroke-glyphs.ts";

let src = await fs.readFile(INFILE, {
    encoding: "utf-8",
});

const first_bracket = src.indexOf("{");

const preamble = `/* Generated from third-party ${INFILE} for KiCanvas.\nSee below for original license. */`;
const license_str = src.slice(0, src.lastIndexOf("*/", first_bracket) + 2);
const glyph_array_str = src.slice(first_bracket + 1, src.lastIndexOf("}") - 1);

const all_glyphs = eval(`[${glyph_array_str}]`);
// Note: This is where the CJK characters are excluded.
const glyphs = all_glyphs.slice(0, 0x4e00);
const excluded_count = all_glyphs.length - glyphs.length;
const glyph_set = new Set(glyphs);
const glyph_map = new Map();

for (const glyph of glyphs) {
    const count = glyph_map.get(glyph) ?? 0;
    glyph_map.set(glyph, count + 1);
}

const repeated_glyphs = new Map();
const repeated_glyph_defs = [];

let unique_index = 0;
for (const [glyph, count] of glyph_map) {
    if (count > 2) {
        repeated_glyphs.set(glyph, unique_index);
        repeated_glyph_defs.push(`${JSON.stringify(glyph)}`);
        unique_index++;
    }
}

const repeated_glyphs_def_str = repeated_glyph_defs.join(", ");

const out_glyphs = glyphs.map((glyph, index) => {
    if (repeated_glyphs.has(glyph)) {
        return repeated_glyphs.get(glyph);
    } else {
        return JSON.stringify(glyph);
    }
});

const out_glyph_array_str = out_glyphs.join(",\n");

console.log(
    `${glyphs.length} total glyphs, ${glyph_set.size} unique, ${excluded_count} excluded`,
);

const code = `export const shared_glyphs = [${repeated_glyphs_def_str}];\n\nexport const glyph_data: (string|number|undefined)[]  = [${out_glyph_array_str}\n];\n`;
const header = `${preamble}\n\n${license_str}`;
const output = `${header}\n\n${code}\n`;

console.log(
    `Output file size: ${Math.round(
        output.length / 1024,
    )} kilobytes with ${Math.round(header.length / 1024)} kilobytes overhead`,
);

await fs.writeFile(OUTFILE, output, "utf8");

console.log(`Wrote glyph data to ${OUTFILE}`);
