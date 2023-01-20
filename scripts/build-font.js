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
const OUTFILE = "./src/resources/glyphs.json";
const STROKE_FONT_SCALE = 1.0 / 21.0;
const FONT_OFFSET = -10;

function ord(c) {
    return c.charCodeAt(0);
}

function decode_val(c) {
    return ord(c) - ord("R");
}

function decode_coord(c) {
    return [decode_val(c[0]), decode_val(c[1])];
}

console.log(`Reading glyph data from ${INFILE}`);

let src_text = await fs.readFile(INFILE, {
    encoding: "utf-8",
});

// Cheating by evaling the big ass C++ file with an array as javascript.
// I'd use JSON but it has comments in it.
src_text = "[" + src_text.slice(src_text.indexOf("{") + 1);
src_text = src_text.slice(0, src_text.indexOf("}")) + "]";

const glyphs_data = eval(src_text);

const glyphs = [];

for (const glyph_data of glyphs_data) {
    const glyph = {
        strokes: [],
        width: 0,
    };

    let start_x = 0;
    let end_x = 0;
    let min_y = 0;
    let max_y = 0;
    let point_list = null;

    for (let i = 0; i < glyph_data.length; i += 2) {
        const coord_raw = [glyph_data[i], glyph_data[i + 1]];
        const coord = decode_coord(coord_raw);

        if (i < 2) {
            // The first coord contains the horizontal bounding box
            start_x = coord[0] * STROKE_FONT_SCALE;
            end_x = coord[1] * STROKE_FONT_SCALE;
        } else if (coord_raw[0] == " " && coord_raw[1] == "R") {
            // End of stroke
            point_list = null;
        } else {
            const point = [
                coord[0] * STROKE_FONT_SCALE - start_x,
                (coord[1] + FONT_OFFSET) * STROKE_FONT_SCALE,
            ];

            // Start of new stroke, create a new list of points and add it to the glyph.
            if (point_list == null) {
                point_list = [];
                glyph.strokes.push(point_list);
            }

            point_list.push(point);

            min_y = Math.min(min_y, point[1]);
            max_y = Math.max(max_y, point[1]);
        }
    }

    glyph.width = end_x - start_x;
    glyph.bbox = { start: [0, min_y], end: [glyph.width, max_y - min_y] };

    glyphs.push(glyph);
}

const output = JSON.stringify(glyphs, null, 2);

await fs.writeFile(OUTFILE, output, "utf8");

console.log(`Wrote glyph data to ${OUTFILE}`);
