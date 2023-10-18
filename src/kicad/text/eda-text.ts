/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Vec2 } from "../../base/math";
import { At, Effects } from "../common";
import { Font, TextAttributes } from "./font";
import { StrokeFont } from "./stroke-font";

/** Primary text mixin
 *
 * KiCAD uses EDA_TEXT as a sort of grab-bag of various things needed to render
 * text across both Eeschema and Pcbnew. There is a lot of meandering code
 * because it has mostly been worked on piecemeal over the years, so there's
 * some stuff that is a little weird and some code that does almost the same
 * thing as other code. I've done my best to keep the structure clean while
 * carefully matching KiCAD's behavior, but it's still a lot to wrap your
 * head around.
 *
 * Note: Just like the underlying Font class, this all expects
 * scaled internal units instead of mm!
 */
export class EDAText {
    constructor(text: string) {
        this.text = text;
    }

    /**
     * Apply "effects" parsed from schematic or board files.
     *
     * KiCAD uses Effects to encapsulate all of the various text
     * options, this translates it into TextAttributes used by Font.
     */
    apply_effects(effects: Effects) {
        this.attributes.h_align = effects.justify.horizontal;
        this.attributes.v_align = effects.justify.vertical;
        this.attributes.mirrored = effects.justify.mirror;
        this.attributes.italic = effects.font.italic;
        this.attributes.bold = effects.font.bold;
        this.attributes.size.set(effects.font.size.multiply(10000));
        this.attributes.stroke_width = (effects.font.thickness ?? 0) * 10000;
        this.attributes.stroke_width = this.get_effective_text_thickness(1588);
        this.attributes.color = effects.font.color;
    }

    /**
     * Apply "at" parsed from schematic or board files.
     *
     * KiCAD uses At to encapsulate both position and rotation. How this is
     * actually applied various based on the actual text item.
     */
    apply_at(at: At) {
        this.text_pos = at.position.multiply(10000);
        this.text_angle = Angle.from_degrees(at.rotation);
    }

    /** The unprocessed text value, as it would be seen in save files */
    text: string;

    /** The processed text that will be used for rendering */
    get shown_text(): string {
        return this.text;
    }

    /** Effective text width selected either the text thickness specified in
     * attributes if it's a valid value or the given default value. */
    get_effective_text_thickness(default_thickness?: number): number {
        let thickness = this.text_thickness;

        if (thickness < 1) {
            thickness = default_thickness ?? 0;

            if (this.bold) {
                thickness = get_bold_thickness(this.text_width);
            } else if (thickness <= 1) {
                thickness = get_normal_thickness(this.text_width);
            }
        }

        thickness = clamp_thickness(thickness, this.text_width, true);

        return thickness;
    }

    public text_pos = new Vec2(0, 0);

    public attributes = new TextAttributes();

    // Aliases for attributes

    get text_angle() {
        return this.attributes.angle;
    }

    set text_angle(a: Angle) {
        this.attributes.angle = a;
    }

    get italic() {
        return this.attributes.italic;
    }

    get bold() {
        return this.attributes.bold;
    }

    get visible() {
        return this.attributes.visible;
    }

    get mirrored() {
        return this.attributes.mirrored;
    }

    get multiline() {
        return this.attributes.multiline;
    }

    get h_align() {
        return this.attributes.h_align;
    }

    set h_align(v) {
        this.attributes.h_align = v;
    }

    get v_align() {
        return this.attributes.v_align;
    }

    set v_align(v) {
        this.attributes.v_align = v;
    }

    get line_spacing() {
        return this.attributes.line_spacing;
    }

    get text_size() {
        return this.attributes.size;
    }

    get text_width() {
        return this.attributes.size.x;
    }

    get text_height() {
        return this.attributes.size.y;
    }

    get text_color() {
        return this.attributes.color;
    }

    get keep_upright() {
        return this.attributes.keep_upright;
    }

    get text_thickness() {
        return this.attributes.stroke_width;
    }

    /**
     * Get the bounding box for a line or lines of text.
     *
     * Used by .bounding_box in LibText and SchField.
     *
     * Note: text is always treated as non-rotated.
     *
     * @param line - which line to measure, if null all lines are measured.
     * @param invert_y - inverts the y axis when calculating the bbox. Used
     *                   by eeschema for symbol text items.
     */
    get_text_box(line?: number, invert_y?: boolean): BBox {
        const pos = this.text_pos.copy();
        const bbox = new BBox(0, 0, 0, 0);
        let strings: string[] = [];
        let text = this.shown_text;
        const thickness = this.get_effective_text_thickness();

        if (this.multiline) {
            strings = text.split("\n");

            if (strings.length) {
                if (line != undefined && line < strings.length) {
                    text = strings[line]!;
                } else {
                    text = strings[0]!;
                }
            }
        }

        // Calculate the horizontal and vertical size.
        const font = StrokeFont.default();
        const font_size = this.text_size.copy();
        const bold = this.bold;
        const italic = this.italic;
        let extents = font.get_line_extents(
            text,
            font_size,
            thickness,
            bold,
            italic,
        );
        let overbar_offset = 0;

        // Create a bbox for horizontal text that's top and left aligned. It'll
        // be adjusted later to account for different orientations and alignments.
        const text_size = extents.copy();

        if (this.multiline && line && line < strings.length) {
            pos.y -= Math.round(line * font.get_interline(font_size.y));
        }

        if (text.includes("~{")) {
            overbar_offset = extents.y / 14;
        }

        if (invert_y) {
            pos.y = -pos.y;
        }

        bbox.start = pos;

        // Merge all bboxes for multiline text where a specific line wasn't
        // requested.
        if (this.multiline && !line && strings.length) {
            for (const line of strings.slice(1)) {
                extents = font.get_line_extents(
                    line,
                    font_size,
                    thickness,
                    bold,
                    italic,
                );
                text_size.x = Math.max(text_size.x, extents.x);
            }

            text_size.y += Math.round(
                (strings.length - 1) * font.get_interline(font_size.y),
            );
        }

        bbox.w = text_size.x;
        bbox.h = text_size.y;

        // Adjust the bbox for justification, mirroring, etc.
        const italic_offset = this.italic
            ? Math.round(font_size.y * Font.italic_tilt)
            : 0;

        switch (this.h_align) {
            case "left":
                if (this.mirrored) {
                    bbox.x = bbox.x - (bbox.w - italic_offset);
                }
                break;
            case "center":
                bbox.x = bbox.x - (bbox.w - italic_offset) / 2;
                break;
            case "right":
                if (!this.mirrored) {
                    bbox.x = bbox.x - (bbox.w - italic_offset);
                }
                break;
        }

        switch (this.v_align) {
            case "top":
                break;
            case "center":
                bbox.y = bbox.y - (bbox.h + overbar_offset) / 2;
                break;
            case "bottom":
                bbox.y = bbox.y - (bbox.h + overbar_offset);
                break;
        }

        return bbox;
    }
}

function get_bold_thickness(text_width: number): number {
    return Math.round(text_width / 5);
}

function get_normal_thickness(text_width: number): number {
    return Math.round(text_width / 8);
}

/** Prevents text from being too thick and overlapping
 *
 * As per KiCAD's Clamp_Text_PenSize, this limits normal text to
 * 18% and bold text to 25%.
 */
function clamp_thickness(
    thickness: number,
    text_width: number,
    allow_bold: boolean,
) {
    const max_thickness = Math.round(text_width * (allow_bold ? 0.25 : 0.18));
    return Math.min(thickness, max_thickness);
}
