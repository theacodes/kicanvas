/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle } from "../math/angle";
import { BBox } from "../math/bbox";
import { Vec2 } from "../math/vec2";
import { EDAText } from "./eda_text";

/**
 * Represents text objects that belong to a symbol. This is just for graphical
 * text and doesn't include fields, pin names, or pin numbers.
 *
 * Note: the methods normalize_text, rotate, mirror_horizontal, and
 * mirror_vertical are all implemented in order to match KiCAD's behavior.
 * The LibTextPainter uses these methods to properly orient and position symbol
 * text, since KiCAD does not directly use a symbol's transformation to orient
 * text. Instead, KiCAD deep copies the library symbol then calls rotate() on
 * text items multiple times based on the symbol instance's rotation. This
 * makes it non-trivial to directly set the text's location and orientation,
 * so we adopt their somewhat convoluted method. See KiCAD's
 * sch_painter.cpp::orientSymbol.
 *
 */
export class LibText extends EDAText {
    constructor(text: string) {
        super(text);
    }

    override get shown_text() {
        return this.text;
    }

    /**
     * Get world space bounding box
     *
     * Schematic symbols use an "inverted" (bottom to top) Y axis, so this
     * flips the box, rotates it, and flips it back so that it's properly
     * in world space.
     */
    get bounding_box(): BBox {
        let bbox = this.get_text_box(undefined, true).mirror_vertical();

        const pos = this.text_pos;
        let start = bbox.start;
        let end = bbox.end;
        const angle = this.text_angle.negative();

        start = angle.rotate_point(start, pos);
        end = angle.rotate_point(end, pos);

        bbox = BBox.from_points([start, end]);
        bbox = bbox.mirror_vertical();

        return bbox;
    }

    /**
     * Internal utility method for offsetting the text position based on the
     * horizontal and vertical justifcation.
     */
    normalize_justification(inverse: boolean) {
        let delta = new Vec2(0, 0);
        const bbox = this.get_text_box();

        if (this.text_angle.is_horizontal) {
            if (this.h_align == "left") {
                delta.x = bbox.w / 2;
            } else if (this.h_align == "right") {
                delta.x = -(bbox.w / 2);
            }

            if (this.v_align == "top") {
                delta.y = -(bbox.h / 2);
            } else if (this.v_align == "bottom") {
                delta.y = bbox.h / 2;
            }
        } else {
            if (this.h_align == "left") {
                delta.y = bbox.w / 2;
            } else if (this.h_align == "right") {
                delta.y = -(bbox.w / 2);
            }

            if (this.v_align == "top") {
                delta.x = bbox.h / 2;
            } else if (this.v_align == "bottom") {
                delta.x = -(bbox.h / 2);
            }
        }

        if (inverse) {
            delta = delta.multiply(-1);
        }

        this.text_pos = this.text_pos.add(delta);
    }

    /**
     * Rotate the text
     *
     * KiCAD's rotation of LIB_TEXT objects is somewhat convoluted, but
     * essentially the text is moved to the center of its current bounding box,
     * rotated around the center, and then offset from the center of the
     * bounding box based on the text justification.
     */
    rotate(center: Vec2, ccw = false) {
        this.normalize_justification(false);

        const angle = Angle.from_degrees(ccw ? -90 : 90);

        this.text_pos = angle.rotate_point(this.text_pos, center);

        if (this.text_angle.is_horizontal) {
            this.text_angle.degrees = 90;
        } else {
            this.h_align = swap_values(this.h_align, "left", "right");
            this.v_align = swap_values(this.v_align, "top", "bottom");
            this.text_angle.degrees = 0;
        }

        this.normalize_justification(true);
    }

    /**
     * Mirrors the text horizontally.
     *
     * Deals with re-assigning the horizontal justification, as mirroring
     * left aligned text is the same as changing it to right aligned.
     */
    mirror_horizontal(center: Vec2) {
        this.normalize_justification(false);
        let x = this.text_pos.x;

        x -= center.x;
        x *= -1;
        x += center.x;

        if (this.text_angle.is_horizontal) {
            this.h_align = swap_values(this.h_align, "left", "right");
        } else {
            this.v_align = swap_values(this.v_align, "top", "bottom");
        }

        this.text_pos.x = x;
        this.normalize_justification(true);
    }

    /**
     * Mirrors the text vertically.
     *
     * Deals with re-assigning the vertical justification, as mirroring
     * top aligned text is the same as changing it to bottom aligned.
     */
    mirror_vertical(center: Vec2) {
        this.normalize_justification(false);
        let y = this.text_pos.y;

        y -= center.y;
        y *= -1;
        y += center.y;

        if (this.text_angle.is_horizontal) {
            this.v_align = swap_values(this.v_align, "top", "bottom");
        } else {
            this.h_align = swap_values(this.h_align, "left", "right");
        }

        this.text_pos.y = y;
        this.normalize_justification(true);
    }
}

/**
 * Helper method for swapping justification values around.
 */
function swap_values<T>(v: T, a: T, b: T): T {
    if (v == a) {
        return b;
    } else if (v == b) {
        return a;
    }
    return v;
}
