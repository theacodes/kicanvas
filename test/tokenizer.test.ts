/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import * as Tokenizer from "../src/kicad/tokenizer";

const Token = Tokenizer.Token;
const OPEN = Token.OPEN;
const CLOSE = Token.CLOSE;
const ATOM = Token.ATOM;
const NUMBER = Token.NUMBER;
const STRING = Token.STRING;
const OPEN_TOKEN = [OPEN, undefined];
const CLOSE_TOKEN = [CLOSE, undefined];

function assert_tokens(parsed_tokens, expected_tokens) {
    for (const expected of expected_tokens) {
        const parsed = parsed_tokens.next().value;
        assert.equal(
            parsed.type,
            expected[0],
            `Expected token ${expected[0].description}: ${expected[1]} found ${parsed.type.description}: ${parsed.value}.`,
        );
        assert.equal(
            parsed.value,
            expected[1],
            `Expected token ${expected[0].description}: ${expected[1]} found ${parsed.type.description}:${parsed.value}.`,
        );
    }
}

suite("tokenizer", function () {
    test("atoms", function () {
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

    test("numbers", function () {
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

    test("strings", function () {
        let tokens = Tokenizer.tokenize('("Hello, world!")');
        assert_tokens(tokens, [
            OPEN_TOKEN,
            [STRING, "Hello, world!"],
            CLOSE_TOKEN,
        ]);
        tokens = Tokenizer.tokenize('("a\\"b")');
        assert_tokens(tokens, [OPEN_TOKEN, [STRING, 'a\\"b'], CLOSE_TOKEN]);
    });
});
