/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import * as board from "../src/kicad/new-board";

import empty_pcb_src from "./files/empty.kicad_pcb";
import paper_pcb_src from "./files/paper.kicad_pcb";
import shapes_pcb_src from "./files/shapes.kicad_pcb";
import text_pcb_src from "./files/text.kicad_pcb";
import traces_pcb_src from "./files/traces.kicad_pcb";
import dimensions_pcb_src from "./files/dimensions.kicad_pcb";
import zones_pcb_src from "./files/zones.kicad_pcb";
import vias_pcb_src from "./files/vias.kicad_pcb";

suite("board parser", function () {
    test("empty pcb file", function () {
        const pcb = new board.KicadPCB(empty_pcb_src);

        assert.equal(pcb.version, 20211014);
        assert.equal(pcb.generator, "pcbnew");
        assert.equal(pcb.general?.thickness, 1.6);
        assert.equal(pcb.paper?.size, "A4");
        assert.equal(pcb.layers.length, 29);
        assert.deepInclude(pcb.layers[0], {
            ordinal: 0,
            canonical_name: "F.Cu",
            type: "signal",
            user_name: undefined,
        });
        assert.deepInclude(pcb.layers[2], {
            ordinal: 32,
            canonical_name: "B.Adhes",
            type: "user",
            user_name: "B.Adhesive",
        });
        assert.deepInclude(pcb.layers[28], {
            ordinal: 58,
            canonical_name: "User.9",
            type: "user",
            user_name: undefined,
        });

        assert.equal(pcb.setup?.pad_to_mask_clearance, 0);

        assert.deepInclude(pcb.setup?.pcbplotparams, {
            layerselection: 0x00010fcffffffff,
            disableapertmacros: false,
            usegerberextensions: false,
            usegerberattributes: true,
            usegerberadvancedattributes: true,
            creategerberjobfile: true,
            svguseinch: false,
            svgprecision: 6,
            excludeedgelayer: true,
            plotframeref: false,
            viasonmask: false,
            mode: 1,
            useauxorigin: false,
            hpglpennumber: 1,
            hpglpenspeed: 20,
            hpglpendiameter: 15,
            dxfpolygonmode: true,
            dxfimperialunits: true,
            dxfusepcbnewfont: true,
            psnegative: false,
            psa4output: false,
            plotreference: true,
            plotvalue: true,
            plotinvisibletext: false,
            sketchpadsonfab: false,
            subtractmaskfromsilk: false,
            outputformat: 1,
            mirror: false,
            drillshape: 1,
            scaleselection: 1,
            outputdirectory: "",
        });

        assert.equal(pcb.nets.length, 1);
        assert.deepInclude(pcb.nets[0], { number: 0, name: "" });
    });

    test("pcb with paper settings & title block", function () {
        const pcb = new board.KicadPCB(paper_pcb_src);

        assert.deepInclude(pcb.paper, {
            size: "User",
            width: 400,
            height: 300,
            portrait: false,
        });

        assert.deepInclude(pcb.title_block, {
            title: "A board",
            date: "2023-02-01",
            rev: "v1",
            company: "Winterbloom",
            comment: {
                1: "Comment 1",
                3: "Comment 3",
                5: "Comment 5",
                7: "Comment 7",
                9: "Comment 9",
            },
        });
    });

    test("pcb with shapes", function () {
        const pcb = new board.KicadPCB(shapes_pcb_src);

        assert.equal(pcb.drawings.length, 6);

        const arc = pcb.drawings[0] as board.GrArc;
        assert(arc instanceof board.GrArc);
        assert.deepInclude(arc, {
            start: { x: 0, y: 10 },
            mid: { x: 2.928932, y: 2.928932 },
            end: { x: 10, y: 0 },
            layer: "Dwgs.User",
            width: 0.2,
        } as Partial<board.GrArc>);

        const rect = pcb.drawings[1] as board.GrRect;
        assert(rect instanceof board.GrRect);
        assert.deepInclude(rect, {
            start: { x: 10, y: 0 },
            end: { x: 20, y: 10 },
            layer: "Dwgs.User",
            width: 0.3,
            fill: "none",
        } as Partial<board.GrRect>);

        const circle = pcb.drawings[2] as board.GrCircle;
        assert(circle instanceof board.GrCircle);
        assert.deepInclude(circle, {
            center: { x: 25, y: 5 },
            end: { x: 30, y: 5 },
            layer: "Dwgs.User",
            width: 0.4,
            fill: "none",
        } as Partial<board.GrCircle>);

        const line = pcb.drawings[3] as board.GrLine;
        assert(line instanceof board.GrLine);
        assert.deepInclude(line, {
            start: { x: 0, y: 0 },
            end: { x: 0, y: 10 },
            layer: "Dwgs.User",
            width: 0.1,
        } as Partial<board.GrLine>);

        const poly1 = pcb.drawings[4] as board.GrPoly;
        assert(poly1 instanceof board.GrPoly);
        assert.deepInclude(poly1, {
            pts: [
                { x: 51, y: 10 },
                { x: 41, y: 10 },
                { x: 46, y: 0 },
            ],
            layer: "Dwgs.User",
            width: 0.6,
            fill: "none",
        } as Partial<board.GrPoly>);

        const poly2 = pcb.drawings[5] as board.GrPoly;
        assert(poly2 instanceof board.GrPoly);
        assert.deepInclude(poly2, {
            pts: [
                { x: 40, y: 10 },
                { x: 30, y: 10 },
                { x: 35, y: 0 },
            ],
            layer: "Dwgs.User",
            width: 0.5,
            fill: "solid",
        } as Partial<board.GrPoly>);
    });

    test("pcb with text", function () {
        const pcb = new board.KicadPCB(text_pcb_src);

        assert.equal(pcb.drawings.length, 10);

        assert.deepInclude(pcb.drawings[0], {
            text: "Text 9",
            at: { position: { x: 0, y: 9 }, rotation: 0 },
            layer: { name: "Dwgs.User" },
            effects: {
                hide: undefined,
                font: {
                    face: undefined,
                    size: { x: 1, y: 1 },
                    thickness: 0.25,
                    italic: false,
                    bold: false,
                },
                justify: {
                    horizontal: "center",
                    vertical: "center",
                    mirror: false,
                },
            },
        } as any);

        assert.deepInclude(pcb.drawings[1], {
            text: "Text 5",
            at: { position: { x: 0, y: 4 }, rotation: 0 },
            layer: { name: "Dwgs.User" },
            effects: {
                hide: undefined,
                font: {
                    face: undefined,
                    size: { x: 1, y: 1 },
                    thickness: 0.25,
                    italic: true,
                    bold: false,
                },
                justify: {
                    horizontal: "right",
                    vertical: "center",
                    mirror: false,
                },
            },
        } as any);

        assert.deepInclude(pcb.drawings[2], {
            text: "Text 7",
            at: { position: { x: 0, y: 6 }, rotation: 180 },
            layer: { name: "Dwgs.User" },
            effects: {
                hide: undefined,
                font: {
                    face: undefined,
                    size: { x: 1, y: 1 },
                    thickness: 0.25,
                    italic: true,
                    bold: false,
                },
                justify: {
                    horizontal: "center",
                    vertical: "center",
                    mirror: false,
                },
            },
        } as any);

        assert.deepInclude(pcb.drawings[3], {
            text: "Text 2",
            at: { position: { x: 0, y: 1 }, rotation: 0 },
            layer: { name: "Dwgs.User" },
            effects: {
                hide: undefined,
                font: {
                    face: undefined,
                    size: { x: 1, y: 1 },
                    thickness: 0.25,
                    italic: false,
                    bold: false,
                },
                justify: {
                    horizontal: "center",
                    vertical: "center",
                    mirror: false,
                },
            },
        } as any);
    });

    test("pcb with traces", function () {
        const pcb = new board.KicadPCB(traces_pcb_src);

        assert.equal(pcb.nets.length, 3);
        assert.include(pcb.nets[0], { number: 0, name: "" });
        assert.include(pcb.nets[1], { number: 1, name: "one" });
        assert.include(pcb.nets[2], { number: 2, name: "two" });

        assert.equal(pcb.segments.length, 7);
        assert.deepInclude(pcb.segments[0], {
            locked: true,
            start: { x: 1, y: 0 },
            end: { x: 1, y: 10 },
            width: 0.5,
            layer: "F.Cu",
            net: 0,
        } as Partial<board.LineSegment>);
        assert.deepInclude(pcb.segments[1], {
            locked: false,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 10 },
            width: 0.25,
            layer: "F.Cu",
            net: 0,
        } as Partial<board.LineSegment>);
        assert.deepInclude(pcb.segments[2], {
            locked: true,
            start: { x: 5, y: 0 },
            end: { x: 5, y: 10 },
            width: 0.5,
            layer: "F.Cu",
            net: 0,
        } as Partial<board.LineSegment>);
        assert.deepInclude(pcb.segments[3], {
            locked: true,
            start: { x: 6, y: 10 },
            mid: { x: 8.928932, y: 2.928932 },
            end: { x: 16, y: 0 },
            width: 0.25,
            layer: "F.Cu",
            net: 0,
        } as Partial<board.ArcSegment>);
        assert.deepInclude(pcb.segments[4], {
            locked: false,
            start: { x: 3, y: 0 },
            end: { x: 3, y: 10 },
            width: 0.5,
            layer: "B.Cu",
            net: 0,
        } as Partial<board.LineSegment>);
        assert.deepInclude(pcb.segments[5], {
            locked: false,
            start: { x: 2, y: 0 },
            end: { x: 2, y: 10 },
            width: 0.25,
            layer: "B.Cu",
            net: 1,
        } as Partial<board.LineSegment>);
        assert.deepInclude(pcb.segments[6], {
            locked: false,
            start: { x: 4, y: 0 },
            end: { x: 4, y: 10 },
            width: 0.25,
            layer: "F.Cu",
            net: 2,
        } as Partial<board.LineSegment>);
    });

    test("pcb with dimensions", function () {
        const pcb = new board.KicadPCB(dimensions_pcb_src);

        assert.equal(pcb.drawings.length, 5);

        assert.deepInclude(pcb.drawings[0], {
            type: "aligned",
            layer: "F.Cu",
            pts: [
                { x: 0, y: 4 },
                { x: 10, y: 4 },
            ],
            height: 0,
            format: {
                prefix: "pre",
                suffix: "post",
                units: 2,
                units_format: 2,
                precision: 3,
                override_value: "val",
                suppress_zeroes: true,
            },
            style: {
                thickness: 0.5,
                arrow_length: 2.54,
                text_position_mode: 1,
                extension_height: 0.58642,
                extension_offset: 1,
                keep_text_aligned: true,
                text_frame: undefined,
            },
        } as any);

        assert.deepInclude((pcb.drawings[0] as board.Dimension).gr_text, {
            text: "preval (mm)post",
            at: { position: { x: 5, y: 4 }, rotation: 0 },
            layer: { name: "F.Cu" },
            effects: {
                font: {
                    face: undefined,
                    size: { x: 2, y: 2 },
                    thickness: 0.5,
                    bold: false,
                    italic: false,
                },
                justify: {
                    horizontal: "left",
                    vertical: "center",
                    mirror: true,
                },
                hide: undefined,
            },
        } as any);

        assert.deepInclude(pcb.drawings[2], {
            type: "leader",
            style: {
                thickness: 0.2,
                arrow_length: 1.27,
                text_position_mode: 0,
                extension_offset: 0.5,
                text_frame: 0,
                keep_text_aligned: undefined,
                extension_height: undefined,
            },
        } as any);

        assert.deepInclude(pcb.drawings[3], {
            type: "center",
        } as Partial<board.Dimension>);

        assert.deepInclude(pcb.drawings[4], {
            type: "orthogonal",
        } as Partial<board.Dimension>);
    });

    test("pcb with zones", function () {
        const pcb = new board.KicadPCB(zones_pcb_src);

        assert.equal(pcb.zones.length, 3);

        const zone1 = pcb.zones[0]!;
        assert.deepInclude(zone1, {
            net: 0,
            net_name: "",
            layer: "F.Cu",
            hatch: { style: "edge", pitch: 0.508 },
            connect_pads: { clearance: 0.508 },
            min_thickness: 0.254,
            filled_areas_thickness: false,
        } as Partial<board.Zone>);
        assert.deepInclude(zone1.fill, {
            fill: true,
            thermal_gap: 0.508,
            thermal_bridge_width: 0.508,
        } as Partial<board.ZoneFill>);
        assert.deepInclude(zone1.polygons[0], {
            pts: [
                { x: 5, y: 5 },
                { x: 0, y: 5 },
                { x: 0, y: 0 },
                { x: 5, y: 0 },
            ],
        } as Partial<board.Poly>);
        assert.deepInclude(zone1.filled_polygons[0], {
            layer: "F.Cu",
            island: true,
        } as Partial<board.FilledPolygon>);

        const zone2 = pcb.zones[1]!;
        assert.deepInclude(zone2, {
            locked: true,
            name: "name",
            hatch: { style: "none", pitch: 0.508 },
            priority: 1,
            connect_pads: { type: "thru_hole_only", clearance: 1 },
        } as Partial<board.Zone>);
        assert.deepInclude(zone2.fill, {
            fill: true,
            mode: "hatch",
            thermal_gap: 0.6,
            thermal_bridge_width: 0.7,
            smoothing: { style: "chamfer" },
            radius: 2,
            island_removal_mode: 2,
            island_area_min: 0.1,
            hatch_smoothing_level: 1,
            hatch_smoothing_value: 0.2,
            hatch_border_algorithm: "hatch_thickness",
            hatch_min_hole_area: 0.3,
        } as Partial<board.ZoneFill>);

        const zone3 = pcb.zones[2]!;
        assert.deepInclude(zone3, {
            layer: "B.Cu",
            name: "keepout",
            hatch: { style: "full", pitch: 0.508 },
            connect_pads: { clearance: 0 },
            keepout: {
                tracks: "not_allowed",
                vias: "not_allowed",
                pads: "not_allowed",
                copperpour: "not_allowed",
                footprints: "not_allowed",
            },
        } as Partial<board.Zone>);
    });

    test("pcb with vias", function () {
        const pcb = new board.KicadPCB(vias_pcb_src);

        assert.equal(pcb.vias.length, 5);

        assert.deepInclude(pcb.vias[0], {
            type: "through-hole",
            locked: true,
            at: { position: { x: 2, y: 0 }, rotation: 0 },
            size: 2,
            drill: 1,
            layers: ["F.Cu", "B.Cu"],
            free: true,
            net: 0,
        } as Partial<board.Via>);
        assert.deepInclude(pcb.vias[1], {
            type: "micro",
            locked: false,
            at: { position: { x: 4, y: 0 }, rotation: 0 },
            size: 2,
            drill: 1,
            layers: ["F.Cu", "In1.Cu"],
            free: true,
            net: 0,
        } as Partial<board.Via>);
        assert.deepInclude(pcb.vias[2], {
            type: "through-hole",
            locked: false,
            at: { position: { x: 0, y: 0 }, rotation: 0 },
            size: 0.8,
            drill: 0.4,
            layers: ["F.Cu", "B.Cu"],
            free: true,
            net: 0,
        } as Partial<board.Via>);
        assert.deepInclude(pcb.vias[4], {
            type: "blind",
            locked: false,
            at: { position: { x: 6, y: 0 }, rotation: 0 },
            size: 2,
            drill: 1,
            layers: ["In2.Cu", "B.Cu"],
            remove_unused_layers: true,
            keep_end_layers: true,
            free: true,
            net: 0,
        } as Partial<board.Via>);
    });
});
