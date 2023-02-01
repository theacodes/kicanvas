/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import * as board from "../src/kicad/new-board";

import empty_pcb_src from "./files/empty.kicad_pcb";
import paper_pcb_src from "./files/paper.kicad_pcb";

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

        assert.equal(pcb.setup.pad_to_mask_clearance, 0);

        assert.deepInclude(pcb.setup.pcbplotparams, {
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
});
