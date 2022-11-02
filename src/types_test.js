import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import * as Tokenizer from "./tokenizer.js";
import * as Parser from "./parser.js";
import * as Types from "./types.js";

Deno.test("At", () => {
    const at = new Types.At(Parser.parse("(1 2)"));
    assertEquals(at.x, 1);
    assertEquals(at.y, 2);
    assertEquals(at.rotation, null);

    const at2 = new Types.At(Parser.parse("(1 2 180)"));
    assertEquals(at2.x, 1);
    assertEquals(at2.y, 2);
    assertEquals(at2.rotation, 180);
});

Deno.test("Full KicadSch", async () => {
    const kicad_sch_text = await Deno.readTextFile("./example1.kicad_sch");
    const sexpr = Parser.parse(kicad_sch_text);
    const sch = new Types.KicadSch(sexpr);
    //console.log(Deno.inspect(sch.lib_symbols, {depth: 10, colors: true}));
    for (const g of sch.iter_graphics()) {
        console.log(g);
    }
});
