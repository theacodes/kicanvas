/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Matrix3, Vec2 } from "../../base/math";
import { EDAText } from "./eda-text";

type Parent = {
    position: Vec2;
    transform: Matrix3;
    is_symbol: boolean;
};

/**
 * Represents a symbol (or sheet) "field", such as the reference, value, or
 * other properties shown along with the symbol.
 *
 * This corresponds to and is roughly based on KiCAD's SCH_FIELD class.
 */
export class SchField extends EDAText {
    constructor(
        text: string,
        public parent?: Parent,
    ) {
        super(text);
    }

    override get shown_text() {
        if (this.text == "~") {
            return "";
        }
        return this.text;
    }

    /** Get effective rotation when drawing, taking into the parent position
     * orientation, and transformation.
     */
    get draw_rotation() {
        let this_deg = this.text_angle.degrees;
        const parent_transform = this.parent?.transform ?? Matrix3.identity();

        // Note: this checks the parent's rotation based on its transform.
        // KiCAD represents transforms with a simple 2x2 matrix which
        // can be made from a Matrix3 using:
        // kicad_matrix = [
        //      m.elements[0], m.elements[1], m.elements[3], m.elements[4]];
        // KiCAD sets the transform of a symbol instance in
        // SCH_SEXPR_PARSER::parseSchematicSymbol() to one of four values
        // depending on the orientation:
        //
        // - 0 degs:   [ 1,  0,  0, -1] - note that y is bottom to top.
        // - 90 degs:  [ 0, -1, -1,  0]
        // - 180 degs: [-1,  0,  0,  1]
        // - 270 degs: [ 0,  1,  1,  0]
        //
        // This means that this code can check if the parent is rotated 90
        // or 270 degres by checking if transform[1] is 1 or -1. transform[1]
        // is the same as matrix[1], so we check that.

        if (Math.abs(parent_transform.elements[1]!) == 1) {
            if (this_deg == 0 || this_deg == 180) {
                this_deg = 90;
            } else {
                this_deg = 0;
            }
        }

        return Angle.from_degrees(this_deg);
    }

    get position(): Vec2 {
        if (this.parent) {
            let relative_pos = this.text_pos.sub(this.parent.position);
            relative_pos = this.parent.transform.transform(relative_pos);
            return relative_pos.add(this.parent.position);
        }
        return this.text_pos;
    }

    get bounding_box(): BBox {
        const bbox = this.get_text_box();

        if (!this.parent?.is_symbol) {
            return bbox;
        }

        // adjust bounding box according to parent location
        const origin = this.parent?.position ?? new Vec2(0, 0);
        const pos = this.text_pos.sub(origin);
        let begin = bbox.start.sub(origin);
        let end = bbox.end.sub(origin);

        begin = this.text_angle.rotate_point(begin, pos);
        end = this.text_angle.rotate_point(end, pos);

        // adjust bounding box based on symbol tranform

        // Symbols have the y axis direction flipped, so the bounding
        // box must also be flipped.
        begin.y = mirror(begin.y, pos.y);
        end.y = mirror(end.y, pos.y);

        // Note: Real identity matrix (without flipped y) is actually needed
        // here.
        const transform = this.parent?.transform ?? Matrix3.identity();

        bbox.start = transform.transform(begin);
        bbox.end = transform.transform(end);
        bbox.start = bbox.start.add(origin);

        return bbox;
    }
}

function mirror(v: number, ref = 0): number {
    return -(v - ref) + ref;
}
