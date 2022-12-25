const STROKE_FONT_SCALE = 1.0 / 21.0;
const FONT_OFFSET = -10;

function ord(c) {
    return c.charCodeAt(0);
}

function chr(i) {
    return String.fromCodePoint(i);
}

let src_text = await Deno.readTextFile("./newstroke_font.cpp");

// Cheating by evaling the big ass C++ file with an array as javascript.
// I'd use JSON but it has comments in it.
src_text = "[" + src_text.slice(src_text.indexOf("{") + 1);
src_text = src_text.slice(0, src_text.indexOf("}")) + "]";

const glyphs_data = eval(src_text);

// See STROKE_FONT::LoadNewStrokeFont

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

    let strokes = 0;

    // Count the number of strokes in the glyph
    for (let i = 0; i < glyph_data.length; i += 2) {
        if (glyph_data[i] == " " || glyph_data[i + 1] == "R") {
            strokes++;
        }
    }

    for (let i = 0; i < glyph_data.length; i += 2) {
        const point = [0, 0];
        const coord = [glyph_data[i], glyph_data[i + 1]];

        if (i < 2) {
            // The first two values contain the width of the glyph
            start_x = (ord(coord[0]) - ord("R")) * STROKE_FONT_SCALE;
            end_x = (ord(coord[1]) - ord("R")) * STROKE_FONT_SCALE;
            glyph.width = end_x - start_x;
        } else if (coord[0] == " " && coord[1] == "R") {
            // End of stroke, reset point_list for the next stroke.
            point_list = null;
        } else {
            // In stroke font, coordinates values are coded as <value> + 'R',
            // <value> is an ASCII char.
            // therefore every coordinate description of the Hershey format has an offset,
            // it has to be subtracted
            // Note:
            //  * the stroke coordinates are stored in reduced form (-1.0 to +1.0),
            //    and the actual size is stroke coordinate * glyph size
            //  * a few shapes have a height slightly bigger than 1.0 ( like '{' '[' )
            point[0] = (ord(coord[0]) - ord("R")) * STROKE_FONT_SCALE - start_x;

            // FONT_OFFSET is here for historical reasons, due to the way the stroke font
            // was built. It allows shapes coordinates like W M ... to be >= 0
            // Only shapes like j y have coordinates < 0
            point[1] =
                (ord(coord[1]) - ord("R") + FONT_OFFSET) * STROKE_FONT_SCALE;

            if (point_list == null) {
                point_list = [];
                glyph.strokes.push(point_list);
            }

            point_list.push(point);

            min_y = Math.min(min_y, point[1]);
            max_y = Math.max(max_y, point[1]);
        }
    }

    glyph.bbox = { start: [0, min_y], end: [glyph.width, max_y - min_y] };

    glyphs.push(glyph);
}

console.log(JSON.stringify(glyphs, null, 2));
