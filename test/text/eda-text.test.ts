/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { Vec2 } from "../../src/base/math";
import { EDAText } from "../../src/kicad/text";

class EDATextImpl extends EDAText {
    constructor(text: string) {
        super(text);
    }

    override get shown_text() {
        return this.text;
    }
}

suite("text.EDAText()", function () {
    test(".get_text_box() simple case", function () {
        // Known reference values taken from KiCAD debugging.
        const text = new EDATextImpl("hello");

        text.text_pos = new Vec2(914400, 1066800);
        text.attributes.size = new Vec2(12700, 12700);
        text.attributes.h_align = "left";
        text.attributes.v_align = "bottom";
        text.attributes.multiline = true;

        assert(text.shown_text, "hello");

        // This is part of the text box calcuation, so best to go ahead and
        // verify it.
        const thickness = text.get_effective_text_thickness();
        assert.closeTo(thickness, 1588, 0.5);

        const bbox = text.get_text_box();

        assert.closeTo(bbox.x, 914400, 0.5);
        assert.closeTo(bbox.y, 1050130, 0.5);
        assert.closeTo(bbox.w, 48600, 0.5);
        assert.closeTo(bbox.h, 16670, 0.5);
    });

    test(".get_text_box() multiline case", function () {
        // Known reference values taken from KiCAD debugging.

        const text = new EDATextImpl("hello\nworld");

        text.text_pos = new Vec2(914400, 1066800);
        text.attributes.size = new Vec2(25600, 25600);
        text.attributes.angle.degrees = 90;
        text.attributes.h_align = "right";
        text.attributes.v_align = "bottom";
        text.attributes.multiline = true;

        // This is part of the text box calcuation, so best to go ahead and
        // verify it.
        const thickness = text.get_effective_text_thickness();
        assert.closeTo(thickness, 3200, 0.5);

        const bbox = text.get_text_box();

        assert.closeTo(bbox.x, 809119, 0.5);
        assert.closeTo(bbox.y, 991728, 0.5);
        assert.closeTo(bbox.w, 105281, 0.5);
        assert.closeTo(bbox.h, 75072, 0.5);
    });
});
