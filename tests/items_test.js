/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as parser from "../src/parser";
import * as items from "../src/items";

Deno.test("At", () => {
    const at = new items.At(parser.parse("(1 2)"));
    assertEquals(at.x, 1);
    assertEquals(at.y, 2);
    assertEquals(at.rotation, 0);

    const at2 = new items.At(parser.parse("(1 2 180)"));
    assertEquals(at2.x, 1);
    assertEquals(at2.y, 2);
    assertEquals(at2.rotation, 180);
});

Deno.test("Full KicadSch", async () => {
    const test_sch_location = path.join(
        path.dirname(path.fromFileUrl(import.meta.url)),
        "./test.kicad_sch"
    );
    const kicad_sch_text = await Deno.readTextFile(test_sch_location);
    const sexpr = parser.parse(kicad_sch_text);
    const sch = new items.KicadSch(sexpr);
    for (const g of sch.iter_graphics()) {
        console.log(g.constructor);
    }
});
