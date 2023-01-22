/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Text rendering using Hershey fonts.
 *
 * The primary interface here is TextShaper
 */

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Angle } from "../math/angle.js";
import { BBox } from "../math/bbox.js";

class GlyphData {
    /**
     * Create Glyph data
     */
    constructor(
        public strokes: number[][][],
        public width: number,
        public bbox: { start: number[], end: number[] }) { }
}

/**
 * A Hershey font
 */
export class Font {
    interline_pitch_ratio = 1.61;
    overbar_position_factor = 1.33;
    underline_position_factor = 0.41;
    bold_factor = 1.3;
    stroke_font_scale = 1.0 / 21.0;
    italic_tilt = 1.0 / 8;
    glyphs;

    constructor() {
        this.glyphs = [];
    }

    /**
     * Load glyph data from the given URL
     */
    async load(src: URL) {
        this.glyphs = await (await fetch(src)).json();
    }

    /**
     * Get the glyph data for a given glyph.
     */
    glyph(chr: string, subsitute = "?"): GlyphData {
        return (
            this.glyphs.at(chr.charCodeAt(0) - 32) ??
            this.glyphs.at(subsitute.charCodeAt(0) - 32)
        );
    }

    /**
     * Vertical distance between two lines of text.
     */
    interline(size: Vec2): number {
        return size.y * this.interline_pitch_ratio;
    }

    /**
     * Get overbar line data for the given glyph
     */
    overbar_for(glyph: GlyphData, italic: boolean): GlyphData {
        const start = [0, -this.overbar_position_factor];
        const end = [glyph.bbox.end[0], start[1]];

        if (italic) {
            start[0] -= start[1] * this.italic_tilt;
        }

        return new GlyphData([[start, end]], glyph.width, glyph.bbox);
    }
}

/**
 * A shaped glyph contains all the information needed
 * to draw a specific character in a string of shaped text.
 */
export class ShapedGlyph {
    matrix: Matrix3;

    /**
     * Create a ShapedGlyph
     */
    constructor(
        public glyph: GlyphData,
        public position: Vec2,
        public size: Vec2,
        public tilt: number = 0
    ) {
        this.glyph = glyph;
        this.position = position;
        this.size = size;
        this.tilt = tilt;
        this.matrix = Matrix3.translation(
            this.position.x,
            this.position.y
        ).scale_self(size.x, size.y);
    }

    /**
     * Yields points from a given stroke transformed by the given matrix
     * and tilt.
     */
    *points(
        stroke: number[][],
        tilt: number
    ) {
        for (const point of stroke) {
            const pt = new Vec2(...point);
            if (tilt) {
                pt.x -= pt.y * tilt;
            }
            yield this.matrix.transform(pt);
        }
    }

    /**
     * Yields line segments representing this glyph's strokes
     */
    *strokes() {
        for (const stroke of this.glyph.strokes) {
            yield this.points(stroke, this.tilt);
        }
    }
}

/**
 * A shaped line contains all of the information and glyphs needed to
 * render a specific line of text.
 */
export class ShapedLine {
    transform: Matrix3 = Matrix3.identity();

    /**
     * Create a ShapedLine
     */
    constructor(
        public font: Font,
        public options: TextOptions,
        public shaped_glyphs: ShapedGlyph[]) { }

    /**
     * Yields line segments needed to draw every glyph that makes up this line
     * of text.
     */
    *strokes() {
        for (const glyph of this.shaped_glyphs) {
            for (const stroke of glyph.strokes()) {
                yield this.transform.transform_all(stroke);
            }
        }
    }

    bbox(): BBox {
        if (!this.shaped_glyphs) {
            return new BBox(0, 0, 0, 0);
        }

        const bbox_points = [];
        const first = this.shaped_glyphs[0];
        for (const stroke of first.strokes()) {
            bbox_points.push(...stroke);
        }
        const last = this.shaped_glyphs.at(-1);
        for (const stroke of last.strokes()) {
            bbox_points.push(...stroke);
        }

        return BBox.from_points(bbox_points).transform(this.transform);
    }

    get extents(): Vec2 {
        // This tries to match KiCAD's STROKE_FONT::ComputeStringBoundaryLimits,
        // which seems to totally ignore the glyph vertical extents for some reason.
        // this means the returned bbox is at the text's *baseline*. If there's some
        // weirdness with text vertical alignment, this might be why.
        const bb = new Vec2(0, 0);

        if (this.shaped_glyphs.length == 0) {
            return bb;
        }

        const last = this.shaped_glyphs[this.shaped_glyphs.length - 1];

        bb.x =
            last.position.x +
            last.glyph.bbox.end[0] * last.size.x +
            this.options.thickness;

        bb.y = this.font.interline(this.options.size);

        if (this.options.italic) {
            bb.x += bb.y * this.font.italic_tilt;
        }

        return bb;
    }
}

/**
 * A shaped paragraph contains a series of shaped lines and associated
 * transforms needed to completely render text.
 */
export class ShapedParagraph {
    constructor(public lines: ShapedLine[]) { }

    get bbox(): BBox {
        const line_bboxes = [];
        for (const line of this.lines) {
            line_bboxes.push(line.bbox());
        }

        return BBox.combine(line_bboxes);
    }

    *strokes(): Generator<Generator<Vec2>> {
        for (const line of this.lines) {
            yield* line.strokes();
        }
    }
}

/**
 * Text rendering options
 */
export class TextOptions {
    constructor(
        public size: Vec2 = new Vec2(1, 1),
        public thickness: number = 0.1,
        public italic: boolean = false,
        public valign: "top" | "center" | "bottom" = "top",
        public halign: "left" | "center" | "right" = "left",
        public mirror: boolean = false,
    ) { }

    copy() {
        return new TextOptions(this.size.copy(), this.thickness, this.italic, this.valign, this.halign, this.mirror);
    }
}

/**
 * A text shaper prepares text for rendering by performing layout and tesselation
 */
export class TextShaper {
    /**
     * Create a TextShaper
     */
    constructor(public font: Font) { }

    /**
     * Load the default font and create a TextShaper for it
     */
    static async default() {
        const font = new Font();
        await font.load(new URL("./resources/glyphs.json", import.meta.url));
        return new TextShaper(font);
    }

    /**
     * Shapes a single line.
     */
    line(text: string, options: TextOptions = new TextOptions()): ShapedLine {
        // Loosely based on KiCAD's STROKE_FONT::drawSingleLineText

        const out = [];
        const line_offset = new Vec2(options.thickness / 2, 0);
        const char_offset = new Vec2(0, 0);
        const base_size = options.size.copy();
        let chr_count = 0;
        let current_size = base_size.copy();
        let brace_depth = 0;
        let super_sup_depth = -1;
        let overbar_depth = -1;
        let last_had_overbar = false;

        for (let i = 0; i < text.length; i++) {
            let chr = text[i];

            if (chr == "\t") {
                chr_count = (Math.floor(chr_count / 4) + 1) * 4 - 1;
                char_offset.x = base_size.x * chr_count;
                char_offset.y = 0;

                // not sure why kicad resets the size whenever it encounters
                // a tab, but this makes us consistent with their behavior.
                current_size = base_size;

                // process the tab as a space from this point.
                chr = " ";
            } else if (chr == "^" && super_sup_depth == -1) {
                if (text.at(i + 1) == "{") {
                    super_sup_depth = brace_depth;
                    brace_depth++;

                    current_size = base_size.multiply(0.8);
                    char_offset.y = -base_size.y * 0.3;

                    i++;
                    continue;
                }
            } else if (chr == "_" && super_sup_depth == -1) {
                if (text.at(i + 1) == "{") {
                    super_sup_depth = brace_depth;
                    brace_depth++;

                    current_size = base_size.multiply(0.8);
                    char_offset.y = base_size.y * 0.1;

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
                    current_size.set(base_size);
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
                    options.italic ? this.font.italic_tilt : 0
                )
            );

            if (overbar_depth > -1) {
                out.push(
                    new ShapedGlyph(
                        this.font.overbar_for(
                            glyph,
                            options.italic && !last_had_overbar
                        ),
                        new Vec2(glyph_postion.x, 0),
                        base_size,
                    )
                );
                last_had_overbar = true;
            } else {
                last_had_overbar = false;
            }

            char_offset.x += current_size.x * glyph.bbox.end[0];
            chr_count++;
        }

        return new ShapedLine(this.font, options, out);
    }

    /**
     * Lays out a paragraph of text
     */
    paragraph(
        text: string,
        position: Vec2,
        rotation: Angle,
        options: TextOptions = new TextOptions(),
    ): ShapedParagraph {
        const text_lines = text.split("\n");
        const shaped_lines = [];

        // Shape all the lines. Do this before drawing anything so that
        // alignment can be done properly.
        for (const line_text of text_lines) {
            shaped_lines.push(
                this.line(line_text, options)
            );
        }

        const line_spacing = this.font.interline(options.size);
        const total_height = (shaped_lines.length - 1) * line_spacing;
        const matrix = Matrix3.translation(position.x, position.y).rotate_self(
            rotation
        );

        switch (options.valign) {
            case "top":
                matrix.translate_self(0, options.size.y);
                break;
            case "center":
                matrix.translate_self(0, options.size.y / 2 - total_height / 2);
                break;
            case "bottom":
                matrix.translate_self(0, -total_height);
        }

        if (options.mirror) {
            matrix.scale_self(-1, 1);
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
            matrix.translate_self(x_offset, 0);
            shaped_line.transform = matrix.copy();
            matrix.translate_self(-x_offset, line_spacing);
        }

        return new ShapedParagraph(shaped_lines);
    }
}
