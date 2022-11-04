/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import * as Tokenizer from "../src/tokenizer.js";

const Token = Tokenizer.Token;
const OPEN = Token.OPEN;
const CLOSE = Token.CLOSE;
const ATOM = Token.ATOM;
const NUMBER = Token.NUMBER;
const STRING = Token.STRING;
const OPEN_TOKEN = [OPEN, undefined];
const CLOSE_TOKEN = [CLOSE, undefined];

function assert_tokens(parsed_tokens, expected_tokens) {
    for (let expected of expected_tokens) {
        const parsed = parsed_tokens.next().value;
        console.log(parsed);
        assertEquals(
            parsed.type,
            expected[0],
            `Expected token ${expected[0]}: ${expected[1]} found ${parsed.type}: ${parsed.value}.`
        );
        assertEquals(
            parsed.value,
            expected[1],
            `Expected token ${expected[0]}: ${expected[1]} found ${parsed.type}:${parsed.value}.`
        );
    }
}

Deno.test("Tokenize atoms", () => {
    let tokens = Tokenizer.tokenize("(abc)");
    assert_tokens(tokens, [OPEN_TOKEN, [ATOM, "abc"], CLOSE_TOKEN]);
    tokens = Tokenizer.tokenize("(abc def)");
    assert_tokens(tokens, [
        OPEN_TOKEN,
        [ATOM, "abc"],
        [ATOM, "def"],
        CLOSE_TOKEN,
    ]);
    tokens = Tokenizer.tokenize("(abc (def))");
    assert_tokens(tokens, [
        OPEN_TOKEN,
        [ATOM, "abc"],
        OPEN_TOKEN,
        [ATOM, "def"],
        CLOSE_TOKEN,
        CLOSE_TOKEN,
    ]);
    tokens = Tokenizer.tokenize("(a1 b2 c3 d4 e5)");
    assert_tokens(tokens, [
        OPEN_TOKEN,
        [ATOM, "a1"],
        [ATOM, "b2"],
        [ATOM, "c3"],
        [ATOM, "d4"],
        [ATOM, "e5"],
        CLOSE_TOKEN,
    ]);
});

Deno.test("Tokenize numbers", () => {
    let tokens = Tokenizer.tokenize("(0)");
    assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, 0], CLOSE_TOKEN]);
    tokens = Tokenizer.tokenize("(123)");
    assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, 123], CLOSE_TOKEN]);
    tokens = Tokenizer.tokenize("(-123)");
    assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, -123], CLOSE_TOKEN]);
    tokens = Tokenizer.tokenize("(-1234.5678)");
    assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, -1234.5678], CLOSE_TOKEN]);
    tokens = Tokenizer.tokenize("(+1234.5678)");
    assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, 1234.5678], CLOSE_TOKEN]);
});

Deno.test("Tokenize strings", () => {
    let tokens = Tokenizer.tokenize('("Hello, world!")');
    assert_tokens(tokens, [OPEN_TOKEN, [STRING, "Hello, world!"], CLOSE_TOKEN]);
    tokens = Tokenizer.tokenize('("a\\"b")');
    assert_tokens(tokens, [OPEN_TOKEN, [STRING, 'a\\"b'], CLOSE_TOKEN]);
});
