/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import * as schematic from "../../src/kicad/schematic";
import { assert_deep_partial } from "../utilities";

import empty_sch_src from "./files/empty.kicad_sch";
import paper_sch_src from "./files/paper.kicad_sch";
import wires_sch_src from "./files/wires.kicad_sch";
import labels_sch_src from "./files/labels.kicad_sch";
import drawings_sch_src from "./files/drawings.kicad_sch";
import symbols_sch_src from "./files/symbols.kicad_sch";
import symbols_kicad8_sch_src from "./files/symbols_kicad8.kicad_sch";

suite("kicad.schematic.KicadSch(): schematic parsing", function () {
    test("with empty schematic file", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", empty_sch_src);

        console.log(sch);

        assert_deep_partial(sch, {
            version: 20211123,
            generator: "eeschema",
            paper: { size: "A4" },
            sheet_instances: {
                sheet_instances: new Map([["/", { path: "/", page: "1" }]]),
            },
        });
    });

    test("with paper settings & title block", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", paper_sch_src);

        assert_deep_partial(sch.paper, {
            size: "User",
            width: 400,
            height: 300,
            portrait: false,
        });

        assert_deep_partial(sch.title_block, {
            title: "page title",
            date: "2023-02-03",
            rev: "v1",
            company: "a company",
            comment: {
                1: "Comment 1",
                3: "Comment 3",
                5: "Comment 5",
                7: "Comment 7",
                9: "Comment 9",
            },
        });
    });

    test("with wires, buses, no connects, and junctions", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", wires_sch_src);

        assert.equal(sch.wires.length, 11);

        // note: KiCAD saves stuff out of order, so the numbers here
        // are goofy. They reflect the visual order of the wires/buses.
        const wire1 = sch.wires[7];
        assert_deep_partial(wire1, {
            pts: [
                { x: 0, y: 0 },
                { x: 0, y: 4 },
            ],
            stroke: {
                width: 0,
                type: "default",
                color: { r: 0, g: 0, b: 0, a: 0 },
            },
        });

        const wire2 = sch.wires[4];
        assert_deep_partial(wire2, {
            pts: [
                { x: 8, y: 0 },
                { x: 8, y: 4 },
            ],
            stroke: {
                width: 0.5,
                type: "dash",
                color: { r: 1, g: 15 / 255, b: 31 / 255, a: 1 },
            },
        });

        assert.equal(sch.buses.length, 6);
        const bus1 = sch.buses[2];
        assert_deep_partial(bus1, {
            pts: [
                { x: 10, y: 0 },
                { x: 10, y: 4 },
            ],
            stroke: {
                width: 0,
                type: "default",
                color: { r: 0, g: 0, b: 0, a: 0 },
            },
        });
        const bus2 = sch.buses[5];
        assert_deep_partial(bus2, {
            pts: [
                { x: 14, y: 0 },
                { x: 14, y: 4 },
            ],
            stroke: {
                width: 0.5,
                type: "dot",
                color: { r: 47 / 255, g: 1, b: 42 / 255, a: 1 },
            },
        });

        assert.equal(sch.bus_entries.length, 2);
        assert_deep_partial(sch.bus_entries[0], {
            at: {
                position: { x: 10, y: 0 },
                rotation: 0,
            },
            size: { x: 2.54, y: 2.54 },
            stroke: {
                width: 0,
                type: "default",
                color: { r: 0, g: 0, b: 0, a: 0 },
            },
        });
        assert_deep_partial(sch.bus_entries[1], {
            at: {
                position: { x: 10, y: 4 },
                rotation: 0,
            },
            size: { x: 2.54, y: -2.54 },
            stroke: {
                width: 0.5,
                type: "dash_dot",
                color: { r: 0, g: 0, b: 1, a: 1 },
            },
        });

        assert.equal(sch.no_connects.length, 2);
        assert_deep_partial(sch.no_connects[0], {
            at: { position: { x: 16, y: 0 }, rotation: 0 },
        } as Partial<schematic.NoConnect>);
        assert_deep_partial(sch.no_connects[1], {
            at: { position: { x: 16, y: 2 }, rotation: 0 },
        });

        assert.equal(sch.junctions.length, 2);
        assert_deep_partial(sch.junctions[0], {
            at: { position: { x: 22, y: 2 }, rotation: 0 },
            diameter: 1,
            color: { r: 23 / 255, g: 59 / 255, b: 1, a: 1 },
        });
        assert_deep_partial(sch.junctions[1], {
            at: { position: { x: 18, y: 2 }, rotation: 0 },
            diameter: 0,
            color: { r: 0, g: 0, b: 0, a: 0 },
        });
    });

    test("with labels", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", labels_sch_src);

        assert.equal(sch.net_labels.length, 6);
        assert_deep_partial(sch.net_labels[0], {
            text: "net label bold and italic",
            at: { position: { x: 10, y: 14 }, rotation: 0 },
            effects: {
                font: {
                    size: { x: 1.27, y: 1.27 },
                    thickness: 0.254,
                    bold: true,
                    italic: true,
                },
                justify: {
                    horizontal: "left",
                    vertical: "bottom",
                },
            },
        });
        assert_deep_partial(sch.net_labels[3], {
            text: "net label top",
            at: { position: { x: 10, y: 10 }, rotation: 270 },
            effects: {
                font: {
                    size: { x: 1.27, y: 1.27 },
                    thickness: 0,
                },
            },
        });
        assert_deep_partial(sch.net_labels[5], {
            text: "net label 2.54",
            at: { position: { x: 10, y: 12 }, rotation: 0 },
            effects: {
                font: {
                    size: { x: 2.54, y: 2.54 },
                    thickness: 0,
                },
            },
        });

        assert.equal(sch.global_labels.length, 5);
        assert_deep_partial(sch.global_labels[0], {
            text: "global label tri state",
            shape: "tri_state",
            at: { position: { x: 10, y: 25 }, rotation: 0 },
            fields_autoplaced: true,
            effects: {
                font: {
                    size: { x: 1.27, y: 1.27 },
                },
                justify: {
                    horizontal: "left",
                    vertical: "center",
                },
            },
            properties: [
                {
                    name: "Intersheet References",
                    text: "${INTERSHEET_REFS}",
                    id: 0,
                },
            ],
        });

        assert.equal(sch.hierarchical_labels.length, 5);
        assert_deep_partial(sch.hierarchical_labels[1], {
            text: "h label bidi",
            shape: "bidirectional",
            at: { position: { x: 14, y: 30 }, rotation: 270 },
            effects: {
                font: {
                    size: { x: 1.27, y: 1.27 },
                    thickness: 0.254,
                    bold: true,
                },
                justify: {
                    horizontal: "right",
                    vertical: "center",
                },
            },
        });
    });

    test("with drawings", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", drawings_sch_src);

        assert.equal(sch.drawings.length, 13);

        const polyline1 = sch.drawings[0] as schematic.Polyline;
        assert_deep_partial(polyline1, {
            pts: [
                { x: 1, y: 0 },
                { x: 2, y: 0 },
            ],
            stroke: {
                width: 0.1,
                type: "solid",
                color: { r: 1, g: 20 / 255, b: 31 / 255, a: 1 },
            },
        });

        const polyline3 = sch.drawings[2] as schematic.Polyline;
        assert_deep_partial(polyline3, {
            pts: [
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ],
            stroke: {
                width: 0,
                type: "default",
                color: { r: 0, g: 0, b: 0, a: 0 },
            },
        });

        const text1 = sch.drawings[8] as schematic.Text;
        assert_deep_partial(text1, {
            text: "left bold italic",
            at: { position: { x: 0, y: 0 }, rotation: 0 },
            effects: {
                font: {
                    size: { x: 2.54, y: 2.54 },
                    thickness: 0.508,
                    bold: true,
                    italic: true,
                },
                justify: {
                    horizontal: "left",
                    vertical: "bottom",
                },
            },
        });

        const text2 = sch.drawings[9] as schematic.Text;
        assert_deep_partial(text2, {
            text: "top normal",
            at: { position: { x: 0, y: 0 }, rotation: 270 },
            effects: {
                font: {
                    size: { x: 1.27, y: 1.27 },
                },
                justify: {
                    horizontal: "right",
                    vertical: "bottom",
                },
            },
        });

        assert.equal(sch.images.length, 1);
    });

    test("with library symbols", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", symbols_sch_src);

        assert.equal(sch.lib_symbols!.symbols.length, 4);

        const lib_c = sch.lib_symbols!.symbols[0];
        assert_deep_partial(lib_c, {
            name: "Device:C",
            pin_numbers: { hide: true },
            pin_names: { offset: 0.254, hide: false },
            in_bom: true,
            on_board: true,
            children: [
                {
                    name: "C_0_1",
                    drawings: [
                        {
                            pts: [
                                { x: -2.032, y: -0.762 },
                                { x: 2.032, y: -0.762 },
                            ],
                            stroke: { type: "default" },
                            fill: { type: "none" },
                        },
                    ],
                },
                {
                    name: "C_1_1",
                    pins: [
                        {
                            type: "passive",
                            shape: "line",
                            at: { position: { x: 0, y: 3.81 }, rotation: 270 },
                            length: 2.794,
                            name: {
                                text: "~",
                                effects: {
                                    font: { size: { x: 1.27, y: 1.27 } },
                                },
                            },
                            number: {
                                text: "1",
                                effects: {
                                    font: { size: { x: 1.27, y: 1.27 } },
                                },
                            },
                        },
                    ],
                },
            ],
        });

        assert_deep_partial(lib_c?.properties.get("Reference"), {
            name: "Reference",
            text: "C",
            id: 0,
            at: { position: { x: 0.635, y: 2.54 }, rotation: 0 },
        });

        assert_deep_partial(lib_c?.properties.get("Value"), {
            name: "Value",
            text: "C",
            id: 1,
        });

        assert_deep_partial(lib_c?.properties.get("Footprint"), {
            name: "Footprint",
            text: "",
            id: 2,
        });

        assert_deep_partial(lib_c?.properties.get("Datasheet"), {
            name: "Datasheet",
            text: "~",
            id: 3,
            effects: {
                hide: true,
            },
        });

        // For this one, just checking that it parsed the Arc drawing
        // correctly, since that's the only big difference between it and the
        // first symbol.
        const lib_c_pol = sch.lib_symbols!.symbols[1];
        assert_deep_partial(lib_c_pol, {
            name: "Device:C_Polarized_US",
            children: [
                {
                    name: "C_Polarized_US_0_1",
                    drawings: [
                        {},
                        {},
                        {},
                        {
                            start: { x: 2.032, y: -1.27 },
                            mid: { x: 0, y: -0.5572 },
                            end: { x: -2.032, y: -1.27 },
                            stroke: { type: "default" },
                            fill: { type: "none" },
                        },
                    ],
                },
            ],
        });

        // For this one, we're checking the rectangle drawing
        // and the different pin shapes.
        const lib_ap1117 = sch.lib_symbols!.symbols[2];
        assert_deep_partial(lib_ap1117, {
            name: "Regulator_Linear:AP1117-15",
            pin_names: {
                hide: false,
                offset: 0.254,
            },
            pin_numbers: {
                hide: false,
            },
            children: [
                {
                    name: "AP1117-15_0_0",
                    drawings: [
                        {
                            // This is a text object, and specifically we need to check that
                            // the rotation ended up getting processed correctly.
                            at: { position: { x: 0, y: 0 }, rotation: 90 },
                        },
                    ],
                },
                {
                    name: "AP1117-15_0_1",
                    drawings: [
                        {
                            start: { x: -5.08, y: -5.08 },
                            end: { x: 5.08, y: 1.905 },
                        },
                    ],
                },
                {
                    name: "AP1117-15_1_1",
                    pins: [
                        {
                            type: "power_in",
                            shape: "line",
                            at: { position: { x: 0, y: -7.62 }, rotation: 90 },
                            length: 2.54,
                            name: {
                                text: "GND",
                                effects: {
                                    font: { size: { x: 1.27, y: 1.27 } },
                                },
                            },
                            number: {
                                text: "1",
                                effects: {
                                    font: { size: { x: 1.27, y: 1.27 } },
                                },
                            },
                        },
                        { type: "power_out", name: { text: "VO" } },
                        { type: "power_in", name: { text: "VI" } },
                    ],
                },
            ],
        });

        // The last one is a power symbol
        const lib_gnd = sch.lib_symbols!.symbols[3];
        assert_deep_partial(lib_gnd, {
            name: "power:GND",
            power: true,
            pin_names: { offset: 0 },
            in_bom: true,
            on_board: true,
        });

        assert_deep_partial(lib_gnd?.properties.get("Reference"), {
            name: "Reference",
            text: "#PWR",
            effects: { hide: true },
        });

        assert_deep_partial(lib_gnd?.properties.get("Value"), {
            name: "Value",
            text: "GND",
        });
    });

    test("with symbols", function () {
        const sch = new schematic.KicadSch("test.kicad_sch", symbols_sch_src);

        const symbols = Array.from(sch.symbols.values());
        assert.equal(symbols.length, 5);

        assert_deep_partial(symbols[0], {
            lib_id: "Device:C",
            at: { position: { x: 5, y: 0 }, rotation: 90 },
            unit: 1,
            in_bom: true,
            on_board: true,
            fields_autoplaced: true,
            pins: [{ number: "1" }, { number: "2" }],
        });

        assert_deep_partial(symbols[0]?.properties.get("Reference"), {
            name: "Reference",
            text: "C?",
            id: 0,
            at: { position: { x: 5, y: -6.35 }, rotation: 90 },
        });

        assert_deep_partial(symbols[0]?.properties.get("Value"), {
            name: "Value",
            text: "10u",
            id: 1,
        });

        assert_deep_partial(symbols[0]?.properties.get("Footprint"), {
            name: "Footprint",
            text: "Capacitor_SMD:C_0603_1608Metric",
            id: 2,
            effects: {
                font: { size: { x: 1.27, y: 1.27 } },
                hide: true,
            },
        });

        assert_deep_partial(symbols[0]?.properties.get("Datasheet"), {
            name: "Datasheet",
            text: "~",
            id: 3,
            effects: { hide: true },
        });

        assert_deep_partial(symbols[1], {
            lib_id: "Device:C",
            at: { position: { x: 5, y: 0 }, rotation: 0 },
        });

        assert_deep_partial(symbols[2], {
            lib_id: "power:GND",
        });

        assert_deep_partial(symbols[3], {
            lib_id: "Regulator_Linear:AP1117-15",
        });

        assert_deep_partial(symbols[4], {
            lib_id: "Device:C_Polarized_US",
            mirror: "x",
        });
    });

    // check the KiCad8 symbol attributes
    test("with KiCad8 exclude_from_sim attribute", function () {
        const sch = new schematic.KicadSch(
            "test.kicad8_sch",
            symbols_kicad8_sch_src,
        );

        const symbols = Array.from(sch.symbols.values());
        assert.equal(symbols.length, 2);

        assert.include(symbols[0], {
            exclude_from_sim: false,
        });

        assert.include(symbols[1], {
            exclude_from_sim: true,
        });

        assert_deep_partial(symbols[0]?.properties.get("Reference"), {
            text: "C2",
        });

        assert_deep_partial(symbols[1]?.properties.get("Reference"), {
            text: "C1",
        });
    });
});
