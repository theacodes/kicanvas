/*
    Copyright (c) 2026 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "chai";
import { Color } from "../../../src/base/color";
import { At, Effects } from "../../../src/kicad/common";
import {
    GlobalLabel,
    HierarchicalLabel,
    Label,
    NetLabel,
} from "../../../src/kicad/schematic";
import witch_hazel from "../../../src/kicanvas/themes/witch-hazel";
import {
    NullRenderLayer,
    NullRenderer,
} from "../../../src/graphics/null-renderer";
import { LayerNames, LayerSet } from "../../../src/viewers/schematic/layers";
import { SchematicPainter } from "../../../src/viewers/schematic/painter";

type LabelConstructor = new (...args: any[]) => Label;

function paint_label(
    LabelType: LabelConstructor,
    color: Color,
): NullRenderLayer {
    const renderer = new NullRenderer();
    renderer.state.stroke_width = 0.1524;

    const layers = new LayerSet(witch_hazel.schematic);
    const painter = new SchematicPainter(
        renderer,
        layers,
        witch_hazel.schematic,
    );
    const effects = new Effects();
    effects.font.color = color;
    const label = Object.assign(Object.create(LabelType.prototype), {
        text: "LABEL",
        at: new At(),
        effects,
        shape: "passive",
    }) as Label;
    const layer = layers.by_name(LayerNames.label)!;

    layer.items.push(label);
    painter.paint_layer(layer);

    return layer.graphics as NullRenderLayer;
}

suite("sch.painters.LabelPainter() label colors", function () {
    const label_types = [NetLabel, GlobalLabel, HierarchicalLabel];

    for (const LabelType of label_types) {
        test(`${LabelType.name} uses an explicit font color`, function () {
            const color = new Color(1, 15 / 255, 31 / 255, 1);
            const shapes = paint_label(LabelType, color).shapes;

            assert.isNotEmpty(shapes);
            for (const shape of shapes) {
                assert.deepEqual(shape.color, color);
            }
        });
    }

    test("uses theme colors for KiCad's zero-alpha default", function () {
        const expected_colors = [
            witch_hazel.schematic.label_local,
            witch_hazel.schematic.label_global,
            witch_hazel.schematic.label_hier,
        ];

        for (const [index, LabelType] of label_types.entries()) {
            const shapes = paint_label(
                LabelType,
                Color.transparent_black,
            ).shapes;

            assert.isNotEmpty(shapes);
            for (const shape of shapes) {
                assert.deepEqual(shape.color, expected_colors[index]);
            }
        }
    });
});
