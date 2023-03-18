/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { Vec2 } from "../../src/base/math";
import { LibText } from "../../src/kicad/text";

function make_text() {
    const text = new LibText("center/bottom/0");
    text.text_pos = new Vec2(0, 101600);
    text.attributes.size = new Vec2(12700, 12700);
    text.attributes.h_align = "center";
    text.attributes.v_align = "bottom";
    text.attributes.multiline = true;
    return text;
}

suite("text.lib_text.LibText()", function () {
    test(".bounding_box", function () {
        const text = make_text();
        text.text_pos = new Vec2(0, 101600);
        text.attributes.size = new Vec2(12700, 12700);
        text.attributes.h_align = "center";
        text.attributes.v_align = "bottom";
        text.attributes.multiline = true;

        let bbox = text.bounding_box;

        assert.equal(bbox.x, -82659.5);
        assert.equal(bbox.y, -118270);
        assert.equal(bbox.w, 165319);
        assert.equal(bbox.h, 16670);

        // Same test, but rotated.
        text.attributes.angle.degrees = 90;

        bbox = text.bounding_box;

        assert.equal(bbox.x, -16670);
        assert.equal(bbox.y, -184259.5);
        assert.equal(bbox.w, 16670);
        assert.equal(bbox.h, 165319);
    });

    test(".normalize_justification()", function () {
        const text = make_text();

        const original_pos = text.text_pos.copy();

        text.normalize_justification(false);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, 109935);

        // calling normalize_justification a second time with inverse=true
        // should restore the original position.

        text.normalize_justification(true);
        assert.equal(text.text_pos.x, original_pos.x);
        assert.equal(text.text_pos.y, original_pos.y);
    });

    test(".rotate()", function () {
        const text = make_text();
        text.h_align = "left";

        text.rotate(new Vec2(0, 0), true);

        assert.equal(text.text_angle.degrees, 90);
        assert.equal(text.text_pos.x, -101600);
        assert.equal(text.text_pos.y, 0);
        assert.equal(text.h_align, "left");
        assert.equal(text.v_align, "bottom");

        text.rotate(new Vec2(0, 0), true);
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, -101600);
        assert.equal(text.h_align, "right");
        assert.equal(text.v_align, "top");

        text.rotate(new Vec2(0, 0), true);
        assert.equal(text.text_angle.degrees, 90);
        assert.equal(text.text_pos.x, 101600);
        assert.equal(text.text_pos.y, 0);
        assert.equal(text.h_align, "right");
        assert.equal(text.v_align, "top");

        text.rotate(new Vec2(0, 0), true);
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, 101600);
        assert.equal(text.h_align, "left");
        assert.equal(text.v_align, "bottom");
    });

    test(".mirror_horizontally()", function () {
        const text = make_text();
        text.h_align = "left";

        text.mirror_horizontally(new Vec2(0, 0));
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, 101600);
        assert.equal(text.h_align, "right");
        assert.equal(text.v_align, "bottom");

        text.mirror_horizontally(new Vec2(0, 0));
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, 101600);
        assert.equal(text.h_align, "left");
        assert.equal(text.v_align, "bottom");
    });

    test(".mirror_vertically()", function () {
        const text = make_text();
        text.h_align = "left";

        text.mirror_vertically(new Vec2(0, 0));
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, -101600);
        assert.equal(text.h_align, "left");
        assert.equal(text.v_align, "top");

        text.mirror_vertically(new Vec2(0, 0));
        assert.equal(text.text_angle.degrees, 0);
        assert.equal(text.text_pos.x, 0);
        assert.equal(text.text_pos.y, 101600);
        assert.equal(text.h_align, "left");
        assert.equal(text.v_align, "bottom");
    });
});
