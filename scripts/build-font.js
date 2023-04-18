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
 * Note: Newstroke is *huge*, nearly 3MB! It's currently the single largest
 * part of KiCanvas's bundle. This is largely due to the CJK character set,
 * so it may make sense to split it into a separate file that's loaded
 * on demand.
 *
 */

import * as fs from "node:fs/promises";

const INFILE = "./third_party/newstroke/newstroke_font.cpp";
const OUTFILE = "./src/text/newstroke-glyphs.ts";

let src = await fs.readFile(INFILE, {
    encoding: "utf-8",
});

const first_bracket = src.indexOf("{");

const preamble = `/* Generated from third-pary ${INFILE} for KiCanvas. See below for original license. */`;
const license_str = src.slice(0, src.lastIndexOf("*/", first_bracket) + 2);
const glyph_array_str = src.slice(first_bracket + 1, src.lastIndexOf("}") - 1);

const glyphs = eval(`[${glyph_array_str}]`);
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

const out_glyphs = glyphs.map((glyph) => {
    if (repeated_glyphs.has(glyph)) {
        return repeated_glyphs.get(glyph);
    } else {
        return JSON.stringify(glyph);
    }
});

const out_glyph_array_str = out_glyphs.join(",\n");

console.log(`${glyphs.length} total glyphs, ${glyph_set.size} unique`);

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
