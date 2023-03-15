/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";
import * as drawing_sheet from "../../src/kicad/drawing-sheet";
import { assert_deep_partial } from "../utilities";

suite("kicad.drawing_sheet.DrawingSheet(): drawing sheet parsing", function () {
    test("with default sheet", function () {
        const sheet = drawing_sheet.DrawingSheet.default();

        assert_deep_partial(sheet, {
            version: 20210606,
            generator: "pl_editor",
        });

        assert_deep_partial(sheet.setup, {
            textsize: { x: 1.5, y: 1.5 },
            linewidth: 0.15,
            textlinewidth: 0.15,
            left_margin: 10,
            right_margin: 10,
            top_margin: 10,
            bottom_margin: 10,
        });

        assert.equal(sheet.drawings.length, 29);

        // (rect (name "") (start 110 34) (end 2 2) (comment "rect around the title block"))
        const rect1 = sheet.drawings[0] as drawing_sheet.Rect;

        assert_deep_partial(rect1, {
            name: "",
            start: { position: { x: 110, y: 34 } },
            end: { position: { x: 2, y: 2 } },
            comment: "rect around the title block",
        });

        // (line (name "") (start 50 2 ltcorner) (end 50 0 ltcorner) (repeat 30) (incrx 50))
        const line1 = sheet.drawings[2] as drawing_sheet.Line;

        assert_deep_partial(line1, {
            name: "",
            start: { position: { x: 50, y: 2 }, anchor: "ltcorner" },
            end: { position: { x: 50, y: 0 }, anchor: "ltcorner" },
            repeat: 30,
            incrx: 50,
        });

        // (tbtext "1" (name "") (pos 25 1 ltcorner) (font (size 1.3 1.3)) (repeat 100) (incrx 50))
        const text1 = sheet.drawings[3] as drawing_sheet.TbText;

        assert_deep_partial(text1, {
            text: "1",
            name: "",
            pos: { position: { x: 25, y: 1 }, anchor: "ltcorner" },
            font: {
                size: { x: 1.3, y: 1.3 },
            },
            repeat: 100,
            incrx: 50,
        });
    });
});
