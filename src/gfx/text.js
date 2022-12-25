/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";

export class Font {
    interline_pitch_ratio = 1.61;
    overbar_position_factor = 1.33;
    underline_position_factor = 0.41;
    bold_factor = 1.3;
    stroke_font_scale = 1.0 / 21.0;
    italic_tilt = 1.0 / 8;

    constructor() {
        this.glyphs = [];
    }

    async load(src) {
        this.glyphs = await (await fetch(src)).json();
    }

    glyph(chr, subsitute = "?") {
        return (
            this.glyphs.at(chr.charCodeAt(0) - 32) ??
            this.glyphs.at(subsitute.charCodeAt(0) - 32)
        );
    }

    interline(size) {
        return size.y * this.interline_pitch_ratio;
    }

    overbar_for(glyph, italic) {
        const start = [0, -this.overbar_position_factor];
        const end = [glyph.bbox.end[0], start[1]];

        if (italic) {
            start[0] -= start[1] * this.italic_tilt;
        }

        return {
            strokes: [[start, end]],
            width: glyph.width,
            bbox: glyph.bbox,
        };
    }
}

export class ShapedGlyph {
    constructor(glyph, position, size, tilt = 0) {
        this.glyph = glyph;
        this.position = position;
        this.size = size;
        this.tilt = tilt;
        this.matrix = Matrix3.translation(
            this.position.x,
            this.position.y
        ).scale(size.x, size.y);
    }

    *points(matrix, stroke) {
        for (const point of stroke) {
            const pt = new Vec2(...point);
            if (this.tilt) {
                pt.x -= pt.y * this.tilt;
            }
            yield matrix.copy().multiply(this.matrix).transform(pt);
        }
    }

    *strokes(matrix) {
        for (const stroke of this.glyph.strokes) {
            yield this.points(matrix, stroke);
        }
    }
}

export class ShapedLine {
    constructor(font, size, thickness, italic, shaped_glyphs) {
        this.font = font;
        this.size = size;
        this.thickness = thickness;
        this.italic = italic;
        this.shaped_glyphs = shaped_glyphs;
    }

    *strokes(matrix) {
        for (const glyph of this.shaped_glyphs) {
            yield* glyph.strokes(matrix);
        }
    }

    get extents() {
        // This tries to match KiCAD's STROKE_FONT::ComputeStringBoundaryLimits,
        // which seems to totally ignore the glyph vertical extents for some reason.
        // this means the returned bbox is at the text's *baseline*. If there's some
        // weirdness with text vertical alignment, this might be why.
        const bb = new Vec2(0, 0);

        if (this.shaped_glyphs.length == 0) {
            return bb;
        }

        const last = this.shaped_glyphs.at(-1);
        bb.x =
            last.position.x +
            last.glyph.bbox.end[0] * last.size.x +
            this.thickness;

        bb.y = this.font.interline(this.size);

        if (this.italic) {
            bb.x += bb.y * this.font.italic_tilt;
        }

        return bb;
    }
}

export class TextShaper {
    constructor(font) {
        this.font = font;
    }

    static async default() {
        const font = new Font();
        await font.load(new URL("../kicad/font/glyphs.json", import.meta.url));
        return new TextShaper(font);
    }

    line(text, size, thickness, italic) {
        // Shapes a single line. Returns an array of glyphs and their locations.
        // See STROKE_FONT::drawSingleLineText

        const out = [];
        const line_offset = new Vec2(thickness / 2, 0);
        const char_offset = new Vec2(0, 0);
        let chr_count = 0;
        let current_size = size;
        let brace_depth = 0;
        let super_sup_depth = -1;
        let overbar_depth = -1;
        let last_had_overbar = false;

        for (let i = 0; i < text.length; i++) {
            let chr = text[i];

            if (chr == "\t") {
                chr_count = (Math.floor(chr_count / 4) + 1) * 4 - 1;
                char_offset.x = size.x * chr_count;
                char_offset.y = 0;

                // not sure why kicad resets the size whenever it encounters
                // a tab, but this makes us consistent with their behavior.
                current_size = size;

                // process the tab as a space from this point.
                chr = " ";
            } else if (chr == "^" && super_sup_depth == -1) {
                if (text.at(i + 1) == "{") {
                    super_sup_depth = brace_depth;
                    brace_depth++;

                    current_size = size.mul_scalar(0.8);
                    char_offset.y = -size.y * 0.3;

                    i++;
                    continue;
                }
            } else if (chr == "_" && super_sup_depth == -1) {
                if (text.at(i + 1) == "{") {
                    super_sup_depth = brace_depth;
                    brace_depth++;

                    current_size = size.mul_scalar(0.8);
                    char_offset.y = size.y * 0.1;

                    i++;
                    continue;
                }
            } else if (chr == "~" && overbar_depth == -1) {
                if (text.at(i + 1) == "{") {
                    overbar_depth = brace_depth;
                    brace_depth++;

                    i++;
                    continue;
                }
            } else if (chr == "}") {
                if (brace_depth > 0) {
                    brace_depth--;
                }

                if (brace_depth == super_sup_depth) {
                    super_sup_depth = -1;
                    current_size = size;
                    char_offset.y = 0;
                    continue;
                }

                if (brace_depth == overbar_depth) {
                    overbar_depth = -1;
                    continue;
                }
            }

            const glyph = this.font.glyph(chr);

            const glyph_postion = new Vec2(
                char_offset.x + line_offset.x,
                char_offset.y + line_offset.y
            );

            out.push(
                new ShapedGlyph(
                    glyph,
                    glyph_postion,
                    current_size.copy(),
                    italic ? this.font.italic_tilt : 0
                )
            );

            if (overbar_depth > -1) {
                out.push(
                    new ShapedGlyph(
                        this.font.overbar_for(
                            glyph,
                            italic && !last_had_overbar
                        ),
                        new Vec2(glyph_postion.x, 0),
                        size.copy()
                    )
                );
                last_had_overbar = true;
            } else {
                last_had_overbar = false;
            }

            char_offset.x += current_size.x * glyph.bbox.end[0];
            chr_count++;
        }

        return new ShapedLine(this.font, size, thickness, italic, out);
    }

    *paragraph(
        text,
        position,
        rotation,
        size,
        thickness,
        options = {
            italic: false,
            valign: "top",
            halign: "left",
            mirror: false,
        }
    ) {
        const text_lines = text.split("\n");
        const shaped_lines = [];

        // Shape all the lines. Do this before drawing anything so that
        // alignment can be done properly.
        for (const line_text of text_lines) {
            shaped_lines.push(
                this.line(line_text, size, thickness, options.italic)
            );
        }

        const line_spacing = this.font.interline(size);
        const total_height = (shaped_lines.length - 1) * line_spacing;
        const matrix = Matrix3.translation(...position).rotate(rotation);

        switch (options.valign) {
            case "top":
                matrix.translate(0, size.y);
                break;
            case "center":
                matrix.translate(0, size.y / 2 - total_height / 2);
                break;
            case "bottom":
                matrix.translate(0, -total_height);
        }

        if (options.mirror) {
            matrix.scale(-1, 1);
        }

        for (const shaped_line of shaped_lines) {
            let x_offset = 0;
            switch (options.halign) {
                case "left":
                    break;
                case "center":
                    x_offset = -shaped_line.extents.x / 2;
                    break;
                case "right":
                    x_offset = -shaped_line.extents.x;
                    break;
            }
            matrix.translate(x_offset, 0);
            yield* shaped_line.strokes(matrix);
            matrix.translate(-x_offset, line_spacing);
        }
    }
}
