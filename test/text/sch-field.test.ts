/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { Angle, Matrix3, Vec2 } from "../../src/base/math";
import { SchField } from "../../src/kicad/text";

// Symbol coordinates are upside down (bottom to top).
const zero_deg_matrix = Matrix3.identity().scale_self(1, -1);
const ninety_deg_matrix = zero_deg_matrix.rotate(Angle.from_degrees(-90));

suite("text.sch_field.SchField()", function () {
    test(".shown_text", function () {
        const field = new SchField("abc");

        assert.equal(field.shown_text, "abc");

        field.text = "~";

        assert.equal(field.shown_text, "");
    });

    test(".draw_rotation", function () {
        const field = new SchField("abc");

        // No parent, should return as-is
        field.attributes.angle.degrees = 90;
        assert.equal(field.draw_rotation.degrees, 90);

        // Should change based on parent orientation.
        field.parent = {
            position: new Vec2(0, 0),
            transform: zero_deg_matrix,
            is_symbol: true,
        };

        assert.equal(field.draw_rotation.degrees, 90);

        field.parent.transform = ninety_deg_matrix;
        assert.equal(field.draw_rotation.degrees, 0);

        field.attributes.angle.degrees = 0;
        assert.equal(field.draw_rotation.degrees, 90);
    });

    test(".position", function () {
        const field = new SchField("abc");
        field.text_pos = new Vec2(571500, 450787);

        // No parent, should return as-is;
        assert.equal(field.position.x, 571500);
        assert.equal(field.position.y, 450787);

        // Should return relative to parent
        field.parent = {
            position: new Vec2(546100, 482600),
            transform: zero_deg_matrix,
            is_symbol: true,
        };

        assert.equal(field.position.x, 571500);
        assert.equal(field.position.y, 514413);

        // Check with parent rotation
        field.text_pos = new Vec2(571500, 457200);
        field.parent = {
            position: new Vec2(546100, 482600),
            transform: ninety_deg_matrix,
            is_symbol: true,
        };

        assert.equal(field.position.x, 571500);
        assert.equal(field.position.y, 457200);
    });

    test(".bounding_box", function () {
        const field = new SchField("C51");
        field.text_pos = new Vec2(571500, 501588);
        field.attributes.size = new Vec2(12700, 12700);
        field.attributes.h_align = "left";
        field.attributes.v_align = "center";
        field.attributes.multiline = true;
        field.parent = {
            position: new Vec2(546100, 482600),
            transform: zero_deg_matrix,
            is_symbol: true,
        };

        let bbox = field.bounding_box;

        assert.equal(bbox.x, 571500);
        assert.equal(bbox.y, 455277);
        assert.equal(bbox.w, 38320);
        assert.equal(bbox.h, 16670);

        // Now with the field rotated
        field.attributes.angle.degrees = 90;

        bbox = field.bounding_box;

        assert.equal(bbox.x, 563165);
        assert.equal(bbox.y, 425292);
        assert.equal(bbox.w, 16670);
        assert.equal(bbox.h, 38320);

        // Now with the field and symbol rotated
        field.parent.transform = ninety_deg_matrix;

        bbox = field.bounding_box;

        assert.equal(bbox.x, 488792);
        assert.equal(bbox.y, 448865);
        assert.equal(bbox.w, 38320);
        assert.equal(bbox.h, 16670);
    });
});
