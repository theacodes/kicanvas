/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import * as schematic from "../src/kicad/newschematic";
import { assert_deep_partial } from "./utilities";

import empty_sch_src from "./files/empty.kicad_sch";
import paper_sch_src from "./files/paper.kicad_sch";
import wires_sch_src from "./files/wires.kicad_sch";

suite("schematic parser", function () {
    test("empty sch file", function () {
        const sch = new schematic.KicadSch(empty_sch_src);

        assert_deep_partial(sch, {
            version: 20211123,
            generator: "eeschema",
            paper: { size: "A4" },
            sheet_instances: { sheet_instances: [{ path: "/", page: "1" }] },
        });
    });

    test("sch with paper settings & title block", function () {
        const sch = new schematic.KicadSch(paper_sch_src);

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

    test("sch with wires, buses, no connects, and junctions", function () {
        const sch = new schematic.KicadSch(wires_sch_src);

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
});
