/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Vec2 } from "../../base/math";
import { is_number, is_string } from "../../base/types";
import { Font, TextStyle } from "./font";
import { Glyph, StrokeGlyph } from "./glyph";
import * as newstroke from "./newstroke-glyphs";

/** Stroke font
 *
 * Stroke font are "Hershey" fonts comprised of strokes.
 *
 * This class is adapted from KiCAD's STROKE_FONT.
 */
export class StrokeFont extends Font {
    static readonly overbar_position_factor = 1.4;
    static readonly underline_position_factor = -0.16;
    static readonly font_scale = 1 / 21;
    static readonly font_offset = -10;

    private static instance?: StrokeFont;

    static default(): StrokeFont {
        if (!this.instance) {
            this.instance = new StrokeFont();
        }
        return this.instance;
    }

    /** Glyph data loaded from newstroke */
    #glyphs: Map<number, StrokeGlyph> = new Map();
    #shared_glyphs: StrokeGlyph[] = [];

    constructor() {
        super("stroke");
        this.#load();
    }

    /**
     * Parses and prepares Newstroke for rendering.
     */
    #load() {
        for (const glyph_data of newstroke.shared_glyphs) {
            this.#shared_glyphs.push(decode_glyph(glyph_data));
        }

        // by default, KiCanvas only loads the first 256 glyphs of newstroke
        // to reduce memory and CPU usage. Additional glyphs are lazy loaded
        // as needed
        for (let i = 0; i < 256; i++) {
            this.#load_glyph(i);
        }
    }

    #load_glyph(idx: number) {
        const data: number | string | undefined = newstroke.glyph_data[idx];
        if (is_string(data)) {
            this.#glyphs.set(idx, decode_glyph(data));
        } else if (is_number(data)) {
            const glyph = this.#shared_glyphs[data]!;
            this.#glyphs.set(idx, glyph);
        } else {
            throw new Error(`Invalid glyph data for glyph ${idx}: ${data}`);
        }

        // remove the glyph data from the array, since it won't be needed again.
        newstroke.glyph_data[idx] = undefined;
    }

    /** Get a glyph for a specific character. */
    get_glyph(c: string): StrokeGlyph {
        const glyph_index = ord(c) - ord(" ");

        if (glyph_index < 0 || glyph_index > newstroke.glyph_data.length) {
            return this.get_glyph("?");
        }

        if (!this.#glyphs.has(glyph_index)) {
            this.#load_glyph(glyph_index);
        }

        return this.#glyphs.get(glyph_index)!;
    }

    override get_line_extents(
        text: string,
        size: Vec2,
        thickness: number,
        bold: boolean,
        italic: boolean,
    ): Vec2 {
        const extents = super.get_line_extents(
            text,
            size,
            thickness,
            bold,
            italic,
        );
        // KiCAD grows the bounding box a little for stroke fonts to
        // accommodate descenders and such.
        const padding = thickness * 1.25 * 2;
        extents.x += padding;
        extents.y += padding;
        return extents;
    }

    override compute_underline_vertical_position(glyph_height: number): number {
        return glyph_height * StrokeFont.underline_position_factor;
    }

    override compute_overbar_vertical_position(glyph_height: number): number {
        return glyph_height * StrokeFont.overbar_position_factor;
    }

    override get_interline(glyph_height: number, line_spacing = 1): number {
        // KiCAD doesn't include glyph thickness for interline spacing in
        // order to keep the spacing between bold and normal text the same.
        return glyph_height * line_spacing * StrokeFont.interline_pitch_ratio;
    }

    override get_text_as_glyphs(
        text: string,
        size: Vec2,
        position: Vec2,
        angle: Angle,
        mirror: boolean,
        origin: Vec2,
        style: TextStyle,
    ): { bbox: BBox; glyphs: Glyph[]; cursor: Vec2 } {
        // Magic numbers from STROKE_FONT::GetTextAsGlyphs
        const space_width = 0.6;
        const inter_char = 0.2;
        const tab_width = 4 * 0.82;
        const super_sub_size_multiplier = 0.7;
        const super_height_offset = 0.5;
        const sub_height_offset = 0.3;

        const glyphs: Glyph[] = [];

        const cursor = position.copy();
        let glyph_size = size.copy();

        // Apply style modifiers
        const tilt = style.italic ? StrokeFont.italic_tilt : 0;
        if (style.subscript || style.superscript) {
            glyph_size = glyph_size.multiply(super_sub_size_multiplier);

            if (style.subscript) {
                cursor.y += glyph_size.y * sub_height_offset;
            } else {
                cursor.y -= glyph_size.y * super_height_offset;
            }
        }

        // Fetch the glyph and add it to the list.
        for (const c of text) {
            switch (c) {
                case "\t":
                    {
                        // tabs are 4 spaces.
                        const char_tab_width = Math.round(
                            glyph_size.x * tab_width,
                        );
                        const current_intrusion =
                            (cursor.x - origin.x) % char_tab_width;
                        cursor.x += char_tab_width - current_intrusion;
                    }
                    break;

                case " ":
                    cursor.x += Math.round(glyph_size.x * space_width);
                    break;

                default:
                    {
                        const source = this.get_glyph(c);
                        const extents = source.bbox.end.multiply(glyph_size);

                        glyphs.push(
                            source.transform(
                                glyph_size,
                                cursor,
                                tilt,
                                angle,
                                mirror,
                                origin,
                            ),
                        );

                        if (tilt) {
                            extents.x -= extents.y * tilt;
                        }

                        cursor.x += Math.round(extents.x);
                    }
                    break;
            }
        }

        // Add overbar or underline, if necessary

        let has_bar = false;
        const bar_offset = new Vec2(0, 0);

        // KiCAD shortens the overbar slightly
        const bar_trim = glyph_size.x * 0.1;

        if (style.overbar) {
            has_bar = true;
            bar_offset.y = this.compute_overbar_vertical_position(glyph_size.y);
        } else if (style.underline) {
            has_bar = true;
            bar_offset.y = this.compute_underline_vertical_position(
                glyph_size.y,
            );
        }

        // Note: KiCanvas treats underline and overbar as mututally exclusive,
        // but technically KiCAD can show both at the same time. I wasn't able
        // to find an actual real world case of this.
        if (has_bar) {
            if (style.italic) {
                bar_offset.x = bar_offset.y * StrokeFont.italic_tilt;
            }

            const bar_start = new Vec2(
                position.x + bar_offset.x + bar_trim,
                cursor.y - bar_offset.y,
            );
            const bar_end = new Vec2(
                cursor.x + bar_offset.x - bar_trim,
                cursor.y - bar_offset.y,
            );

            const bar_glyph = new StrokeGlyph(
                [[bar_start, bar_end]],
                BBox.from_points([bar_start, bar_end]),
            );

            glyphs.push(
                bar_glyph.transform(
                    new Vec2(1, 1),
                    new Vec2(0, 0),
                    0,
                    angle,
                    mirror,
                    origin,
                ),
            );
        }

        const bbox = new BBox();
        bbox.start = position;
        bbox.end = new Vec2(
            cursor.x + bar_offset.x - Math.round(glyph_size.x * inter_char),
            cursor.y +
                Math.max(
                    glyph_size.y,
                    bar_offset.y * StrokeFont.overbar_position_factor,
                ),
        );

        return {
            bbox: bbox,
            glyphs: glyphs,
            cursor: new Vec2(cursor.x, position.y),
        };
    }
}

function ord(c: string): number {
    return c.charCodeAt(0);
}

function decode_coord_val(c: string): number {
    return ord(c) - ord("R");
}

function decode_coord(c: [string, string]): [number, number] {
    return [decode_coord_val(c[0]!), decode_coord_val(c[1]!)];
}

/**
 * Parses a newstroke glyph
 *
 * Newstroke is distributed as a .cpp file and a old-format KiCAD library,
 * this script reads a JS-ified version.
 *
 * The code here is based on KiCAD's STROKE_FONT::LoadNewStrokeFont
 *
 *  Notes:
 *  - Coordinate values are coded as ASCII characters relative to "R".
 *  - Coordinate values are -1 to +1.
 *  - FONT_OFFSET is used to allow descenders that go below the baseline
 *
 */
function decode_glyph(glyph_data: string) {
    let start_x = 0;
    let end_x = 0;
    let width = 0;
    let min_y = 0;
    let max_y = 0;
    const strokes: Vec2[][] = [];
    let points: Vec2[] | null = null;

    for (let i = 0; i < glyph_data.length; i += 2) {
        const coord_raw: [string, string] = [
            glyph_data[i]!,
            glyph_data[i + 1]!,
        ];
        const coord = decode_coord(coord_raw);

        if (i < 2) {
            // The first coord contains the horizontal bounding box
            start_x = coord[0] * StrokeFont.font_scale;
            end_x = coord[1] * StrokeFont.font_scale;
            width = end_x - start_x;
        } else if (coord_raw[0] == " " && coord_raw[1] == "R") {
            // End of stroke
            points = null;
        } else {
            const point = new Vec2(
                coord[0] * StrokeFont.font_scale - start_x,
                (coord[1] + StrokeFont.font_offset) * StrokeFont.font_scale,
            );

            // Start of new stroke, create a new list of points and add it to the glyph.
            if (points == null) {
                points = [];
                strokes.push(points);
            }

            min_y = Math.min(min_y, point.y);
            max_y = Math.max(max_y, point.y);

            points.push(point);
        }
    }

    const bb = new BBox(0, min_y, width, max_y - min_y);
    const glyph = new StrokeGlyph(strokes, bb);

    return glyph;
}
