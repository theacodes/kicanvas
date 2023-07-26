/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import { Angle, Vec2 } from "../../../src/base/math";
import { NullRenderer } from "../../../src/graphics/null-renderer";
import { GlobalLabel, HierarchicalLabel } from "../../../src/kicad/schematic";
import { SchText } from "../../../src/kicad/text";
import witch_hazel from "../../../src/kicanvas/themes/witch-hazel";
import { DocumentPainter } from "../../../src/viewers/base/painter";
import { ViewLayerSet } from "../../../src/viewers/base/view-layers";
import {
    GlobalLabelPainter,
    HierarchicalLabelPainter,
    LabelPainter,
} from "../../../src/viewers/schematic/painters/label";

const renderer = new NullRenderer();
const layer_set = new ViewLayerSet();
const document_painter = new DocumentPainter(
    renderer,
    layer_set,
    witch_hazel.board,
);

suite("sch.painters.label.LabelPainter()", function () {
    const painter = new LabelPainter(document_painter, renderer);
    const schtext = new SchText("abc");

    test(".get_text_offset()", function () {
        // Reference values from KiCAD debugging
        schtext.text_size.set(12700, 12700);
        assert.equal(painter.get_text_offset(schtext), 1905);

        schtext.text_size.set(25400, 25400);
        assert.equal(painter.get_text_offset(schtext), 3810);
    });

    test(".get_box_expansion()", function () {
        // Reference values from KiCAD debugging
        schtext.text_size.set(12700, 12700);
        assert.equal(painter.get_box_expansion(schtext), 4763);

        schtext.text_size.set(25400, 25400);
        assert.equal(painter.get_box_expansion(schtext), 9525);
    });

    test(".get_schematic_text_offset()", function () {
        let offset: Vec2;

        // Reference values from KiCAD debugging
        schtext.text_size.set(12700, 12700);
        offset = painter.get_schematic_text_offset(null!, schtext);
        assert.equal(offset.x, 0);
        assert.equal(offset.y, -3493);

        schtext.text_size.set(25400, 25400);
        offset = painter.get_schematic_text_offset(null!, schtext);
        assert.equal(offset.x, 0);
        assert.equal(offset.y, -6985);

        schtext.set_spin_style_from_angle(Angle.from_degrees(90));
        offset = painter.get_schematic_text_offset(null!, schtext);
        assert.equal(offset.x, -6985);
        assert.equal(offset.y, 0);
    });
});

suite("sch.painters.label.GlobalLabelPainter()", function () {
    const painter = new GlobalLabelPainter(document_painter, renderer);

    test(".get_schematic_text_offset() no tail", function () {
        const schtext = new SchText("abc");
        const label: GlobalLabel = {
            shape: "passive",
            at: {
                rotation: 0,
            },
        } as GlobalLabel;
        let offset: Vec2;
        schtext.text_size.set(12700, 12700);

        // Reference values from KiCAD debugging
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 4763);
        assert.equal(offset.y, 908);

        label.at.rotation = 90;
        schtext.set_spin_style_from_angle(Angle.from_degrees(90));
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 908);
        assert.equal(offset.y, -4763);

        label.at.rotation = 180;
        schtext.set_spin_style_from_angle(Angle.from_degrees(180));
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, -4763);
        assert.equal(offset.y, 908);

        label.at.rotation = 270;
        schtext.set_spin_style_from_angle(Angle.from_degrees(270));
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 908);
        assert.equal(offset.y, 4763);
    });

    test(".get_schematic_text_offset() with tail", function () {
        const schtext = new SchText("abc");
        const label: GlobalLabel = {
            shape: "input",
            at: {
                rotation: 0,
            },
        } as GlobalLabel;
        let offset: Vec2;
        schtext.text_size.set(12700, 12700);

        // Reference values from KiCAD debugging
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 14288);
        assert.equal(offset.y, 908);

        label.at.rotation = 90;
        schtext.set_spin_style_from_angle(Angle.from_degrees(90));
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 908);
        assert.equal(offset.y, -14288);
    });
});

suite("sch.painters.label.HierarchicalLabelPainter()", function () {
    const painter = new HierarchicalLabelPainter(document_painter, renderer);
    const schtext = new SchText("abc");

    test(".get_schematic_text_offset()", function () {
        const label: HierarchicalLabel = {
            shape: "input",
            at: {
                rotation: 0,
            },
        } as HierarchicalLabel;

        let offset: Vec2;

        // Reference values from KiCAD debugging
        schtext.text_size.set(12700, 12700);
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 14605);
        assert.equal(offset.y, 0);

        schtext.text_size.set(25400, 25400);
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 29210);
        assert.equal(offset.y, 0);

        label.at.rotation = 90;
        schtext.set_spin_style_from_angle(Angle.from_degrees(90));
        offset = painter.get_schematic_text_offset(label, schtext);
        assert.equal(offset.x, 0);
        assert.equal(offset.y, -29210);
    });
});
