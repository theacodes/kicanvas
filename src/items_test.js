/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import * as parser from "./parser.js";
import * as items from "./items.js";

Deno.test("At", () => {
    const at = new items.At(parser.parse("(1 2)"));
    assertEquals(at.x, 1);
    assertEquals(at.y, 2);
    assertEquals(at.rotation, null);

    const at2 = new items.At(parser.parse("(1 2 180)"));
    assertEquals(at2.x, 1);
    assertEquals(at2.y, 2);
    assertEquals(at2.rotation, 180);
});

Deno.test("Full KicadSch", async () => {
    const kicad_sch_text = await Deno.readTextFile("./example1.kicad_sch");
    const sexpr = parser.parse(kicad_sch_text);
    const sch = new items.KicadSch(sexpr);
    //console.log(Deno.inspect(sch.lib_symbols, {depth: 10, colors: true}));
    for (const g of sch.iter_graphics()) {
        console.log(g);
    }
});
