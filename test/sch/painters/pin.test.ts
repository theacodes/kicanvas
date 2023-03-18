/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import { Vec2 } from "../../../src/base/math";
import {
    PinLabelInternals,
    PinPainter,
    PinShapeInternals,
    type PinInfo,
} from "../../../src/viewers/schematic/painters/pin";

suite("sch.painters.pin.PinPainter", function () {
    test(".apply_symbol_transformations() - position only", function () {
        const pin: PinInfo = {
            position: new Vec2(1000, 2000),
        } as PinInfo;
        const transforms = {
            position: new Vec2(127000, 254000),
            rotations: 0,
            mirror_x: false,
            mirror_y: false,
        };

        PinPainter.apply_symbol_transformations(pin, transforms);

        assert.equal(pin.position.x, 128000);
        assert.equal(pin.position.y, 252000);
    });

    test(".apply_symbol_transformations() - rotations only", function () {
        const pin: PinInfo = {
            position: new Vec2(1000, 0),
        } as PinInfo;
        const transforms = {
            position: new Vec2(127000, 254000),
            rotations: 1,
            mirror_x: false,
            mirror_y: false,
        };

        PinPainter.apply_symbol_transformations(pin, transforms);
        assert.equal(pin.position.x, 127000);
        assert.equal(pin.position.y, 253000);

        pin.position.set(1000, 0);
        transforms.rotations = 2;
        PinPainter.apply_symbol_transformations(pin, transforms);
        assert.equal(pin.position.x, 126000);
        assert.equal(pin.position.y, 254000);

        pin.position.set(1000, 0);
        transforms.rotations = 3;
        PinPainter.apply_symbol_transformations(pin, transforms);
        assert.equal(pin.position.x, 127000);
        assert.equal(pin.position.y, 255000);

        pin.position.set(1000, 0);
        transforms.rotations = 4;
        PinPainter.apply_symbol_transformations(pin, transforms);
        assert.equal(pin.position.x, 128000);
        assert.equal(pin.position.y, 254000);
    });

    test(".apply_symbol_transformations() - mirroring", function () {
        const pin: PinInfo = {
            position: new Vec2(0, 1000),
            orientation: "up",
        } as PinInfo;
        const transforms = {
            position: new Vec2(127000, 254000),
            rotations: 0,
            mirror_x: true,
            mirror_y: false,
        };

        PinPainter.apply_symbol_transformations(pin, transforms);
        assert.equal(pin.position.x, 127000);
        assert.equal(pin.position.y, 255000);
        assert.equal(pin.orientation, "down");

        pin.position.set(1000, 0);
        pin.orientation = "left";
        transforms.mirror_x = false;
        transforms.mirror_y = true;
        PinPainter.apply_symbol_transformations(pin, transforms);
        assert.equal(pin.position.x, 126000);
        assert.equal(pin.position.y, 254000);
        assert.equal(pin.orientation, "right");
    });
});

suite("sch.painters.pin.PinShapeInternals", function () {
    test(".stem()", function () {
        // Reference data from KiCAD debugging
        let stem;

        stem = PinShapeInternals.stem(new Vec2(1714500, 876300), "left", 25400);
        assert.equal(stem.p0.x, 1689100);
        assert.equal(stem.p0.y, 876300);
        assert.equal(stem.dir.x, 1);
        assert.equal(stem.dir.y, 0);

        stem = PinShapeInternals.stem(new Vec2(1587500, 673100), "down", 25400);
        assert.equal(stem.p0.x, 1587500);
        assert.equal(stem.p0.y, 698500);
        assert.equal(stem.dir.x, 0);
        assert.equal(stem.dir.y, -1);

        stem = PinShapeInternals.stem(new Vec2(1587500, 1028700), "up", 25400);
        assert.equal(stem.p0.x, 1587500);
        assert.equal(stem.p0.y, 1003300);
        assert.equal(stem.dir.x, 0);
        assert.equal(stem.dir.y, 1);

        stem = PinShapeInternals.stem(
            new Vec2(1460500, 800100),
            "right",
            25400,
        );
        assert.equal(stem.p0.x, 1485900);
        assert.equal(stem.p0.y, 800100);
        assert.equal(stem.dir.x, -1);
        assert.equal(stem.dir.y, 0);
    });
});

suite("sch.painters.pin.PinLabelInternals", function () {
    // Reference data from KiCAD debugging
    const text_margin = 1016;
    const pin_thickness = 1524;
    const text_thickness = 1524;
    const pin_length = 25400;
    const text_offset = 5080;

    test(".place_above()", function () {
        let placement;

        placement = PinLabelInternals.place_above(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "right",
        );

        assert.equal(placement.offset.x, 12700);
        assert.equal(placement.offset.y, -2540);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "bottom");
        assert.equal(placement.orientation, "right");

        placement = PinLabelInternals.place_above(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "left",
        );

        assert.equal(placement.offset.x, -12700);
        assert.equal(placement.offset.y, -2540);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "bottom");
        assert.equal(placement.orientation, "left");

        placement = PinLabelInternals.place_above(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "down",
        );

        assert.equal(placement.offset.x, -2540);
        assert.equal(placement.offset.y, 12700);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "bottom");
        assert.equal(placement.orientation, "down");

        placement = PinLabelInternals.place_above(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "up",
        );

        assert.equal(placement.offset.x, -2540);
        assert.equal(placement.offset.y, -12700);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "bottom");
        assert.equal(placement.orientation, "up");
    });

    test(".place_below()", function () {
        let placement;

        placement = PinLabelInternals.place_below(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "right",
        );

        assert.equal(placement.offset.x, 12700);
        assert.equal(placement.offset.y, 2540);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "top");
        assert.equal(placement.orientation, "right");

        placement = PinLabelInternals.place_below(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "left",
        );

        assert.equal(placement.offset.x, -12700);
        assert.equal(placement.offset.y, 2540);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "top");
        assert.equal(placement.orientation, "left");

        placement = PinLabelInternals.place_below(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "down",
        );

        assert.equal(placement.offset.x, 2540);
        assert.equal(placement.offset.y, 12700);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "top");
        assert.equal(placement.orientation, "down");

        placement = PinLabelInternals.place_below(
            text_margin,
            pin_thickness,
            text_thickness,
            pin_length,
            "up",
        );

        assert.equal(placement.offset.x, 2540);
        assert.equal(placement.offset.y, -12700);
        assert.equal(placement.h_align, "center");
        assert.equal(placement.v_align, "top");
        assert.equal(placement.orientation, "up");
    });

    test(".place_inside()", function () {
        let placement;

        placement = PinLabelInternals.place_inside(
            text_offset,
            text_thickness,
            pin_length,
            "left",
        );

        assert.equal(placement.offset.x, -29718);
        assert.equal(placement.offset.y, 0);
        assert.equal(placement.h_align, "right");
        assert.equal(placement.v_align, "center");
        assert.equal(placement.orientation, "left");

        placement = PinLabelInternals.place_inside(
            text_offset,
            text_thickness,
            pin_length,
            "right",
        );

        assert.equal(placement.offset.x, 29718);
        assert.equal(placement.offset.y, 0);
        assert.equal(placement.h_align, "left");
        assert.equal(placement.v_align, "center");
        assert.equal(placement.orientation, "right");

        placement = PinLabelInternals.place_inside(
            text_offset,
            text_thickness,
            pin_length,
            "up",
        );

        assert.equal(placement.offset.x, 0);
        assert.equal(placement.offset.y, -29718);
        assert.equal(placement.h_align, "left");
        assert.equal(placement.v_align, "center");
        assert.equal(placement.orientation, "up");

        placement = PinLabelInternals.place_inside(
            text_offset,
            text_thickness,
            pin_length,
            "down",
        );

        assert.equal(placement.offset.x, 0);
        assert.equal(placement.offset.y, 29718);
        assert.equal(placement.h_align, "right");
        assert.equal(placement.v_align, "center");
        assert.equal(placement.orientation, "down");
    });
});
