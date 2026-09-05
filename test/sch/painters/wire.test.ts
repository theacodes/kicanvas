/*
    Copyright (c) 2026 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "chai";
import { Color } from "../../../src/base/color";
import { Vec2 } from "../../../src/base/math";
import {
    NullRenderLayer,
    NullRenderer,
} from "../../../src/graphics/null-renderer";
import { Polyline } from "../../../src/graphics/shapes";
import { Stroke } from "../../../src/kicad/common";
import { Wire } from "../../../src/kicad/schematic";
import witch_hazel from "../../../src/kicanvas/themes/witch-hazel";
import { LayerNames, LayerSet } from "../../../src/viewers/schematic/layers";
import { SchematicPainter } from "../../../src/viewers/schematic/painter";

function paint_wire(color?: Color, with_stroke = true): Polyline {
    const renderer = new NullRenderer();
    renderer.state.stroke_width = 0.1524;

    const layers = new LayerSet(witch_hazel.schematic);
    const painter = new SchematicPainter(
        renderer,
        layers,
        witch_hazel.schematic,
    );
    const wire = Object.assign(Object.create(Wire.prototype), {
        pts: [new Vec2(0, 0), new Vec2(10, 0)],
    }) as Wire;

    if (with_stroke) {
        wire.stroke = {
            ...Stroke.default_value(),
            ...(color ? { color } : {}),
        };
    }
    const layer = layers.by_name(LayerNames.wire)!;

    layer.items.push(wire);
    painter.paint_layer(layer);

    return (layer.graphics as NullRenderLayer).shapes[0] as Polyline;
}

suite("sch.painters.WirePainter()", function () {
    test("uses an explicit KiCad stroke color", function () {
        const color = new Color(1, 15 / 255, 31 / 255, 1);

        assert.deepEqual(paint_wire(color).color, color);
    });

    test("uses the theme color for KiCad's zero-alpha default", function () {
        assert.deepEqual(
            paint_wire(Color.transparent_black).color,
            witch_hazel.schematic.wire,
        );
    });

    test("uses the theme color when a legacy stroke omits color", function () {
        assert.deepEqual(paint_wire().color, witch_hazel.schematic.wire);
    });

    test("uses the theme color when a legacy wire omits stroke", function () {
        assert.deepEqual(
            paint_wire(undefined, false).color,
            witch_hazel.schematic.wire,
        );
    });
});
