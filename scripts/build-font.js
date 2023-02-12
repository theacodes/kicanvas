/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Parses and prepares Newstroke for rendering in JavaScript.
 *
 * Newstroke is distributed as a .cpp file and a old-format KiCAD library,
 * this script transforms it into a simple JSON file for easy consumption by
 * KiCanvas.
 *
 * The script here is based loosely on KiCAD's STROKE_FONT::LoadNewStrokeFont
 *
 *  Notes:
 *  - Coordinates values are coded as ASCII characters relative to "R".
 *  - FONT_OFFSET is used to allow descenders that go below the baseline
 *
 *
 */

import * as fs from "fs/promises";

const INFILE = "./third_party/newstroke/newstroke_font.cpp";
const OUTFILE = "./src/text/newstroke_glyphs.ts";

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
    if (count > 10) {
        repeated_glyphs.set(glyph, unique_index);
        repeated_glyph_defs.push(`${JSON.stringify(glyph)}`);
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
