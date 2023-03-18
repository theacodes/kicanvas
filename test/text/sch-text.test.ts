/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { Angle } from "../../src/base/math";
import { SchText } from "../../src/kicad/text";

suite("text.sch_text.SchText()", function () {
    test(".set_spin_style_from_angle()", function () {
        const text = new SchText("abc");

        text.set_spin_style_from_angle(Angle.from_degrees(0));
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.h_align, "left");

        text.set_spin_style_from_angle(Angle.from_degrees(90));
        assert.equal(text.text_angle.degrees, 90);
        assert.equal(text.h_align, "left");

        text.set_spin_style_from_angle(Angle.from_degrees(180));
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.h_align, "right");

        text.set_spin_style_from_angle(Angle.from_degrees(270));
        assert.equal(text.text_angle.degrees, 90);
        assert.equal(text.h_align, "right");
    });
});
