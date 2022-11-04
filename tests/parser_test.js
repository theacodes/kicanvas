/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import * as Parser from "../src/parser.js";

Deno.test("Basic types", () => {
    Parser.parse("(abc)").expect_atom("abc");
    Parser.parse("(123.4)").expect_number(123.4);
    Parser.parse('("Hello!")').expect_string("Hello!");
    Parser.parse("((abc))").expect_list().expect_atom("abc");
});

Deno.test("Pairs", () => {
    assertEquals(Parser.parse("((abc def))").expect_pair_atom("abc"), "def");
    assertEquals(Parser.parse("((abc 123))").expect_pair_number("abc"), 123);
    assertEquals(Parser.parse('((abc "Hello!"))').expect_pair_string("abc"), "Hello!");
    const pair_list = Parser.parse("((abc (1 2)))").expect_pair_list("abc");
    pair_list.expect_number(1);
    pair_list.expect_number(2);
});
