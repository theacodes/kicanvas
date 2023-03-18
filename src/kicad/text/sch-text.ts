/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle } from "../../base/math";
import { At } from "../common";
import { EDAText } from "./eda-text";

/**
 * Represents text objects that belong to the schematic, not to any individual
 * symbol. These are created via the "Text" tool in Eeschema.
 *
 * This class is also used by the LabelPainter and PinPainter, specifically
 * for apply set_spin_style_from_angle. It might be possible to remove this
 * class altogether in favor of just have that method somewhere.
 */
export class SchText extends EDAText {
    constructor(text: string) {
        super(text);
    }

    override apply_at(at: At): void {
        super.apply_at(at);
        this.set_spin_style_from_angle(this.text_angle);
    }

    set_spin_style_from_angle(a: Angle) {
        switch (a.degrees) {
            default:
            case 0:
                // right
                this.text_angle.degrees = 0;
                this.h_align = "left";
                break;
            case 90:
                // up
                this.text_angle.degrees = 90;
                this.h_align = "left";
                break;
            case 180:
                //left
                this.text_angle.degrees = 0;
                this.h_align = "right";
                break;
            case 270:
                // down
                this.text_angle.degrees = 90;
                this.h_align = "right";
                break;
        }

        this.v_align = "bottom";
    }

    override get shown_text() {
        return this.text;
    }
}
