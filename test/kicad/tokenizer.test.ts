/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import * as tokenizer from "../../src/kicad/tokenizer";

const Token = tokenizer.Token;
const OPEN = Token.OPEN;
const CLOSE = Token.CLOSE;
const ATOM = Token.ATOM;
const NUMBER = Token.NUMBER;
const STRING = Token.STRING;
const OPEN_TOKEN: [symbol, any] = [OPEN, undefined];
const CLOSE_TOKEN: [symbol, any] = [CLOSE, undefined];

function assert_tokens(
    parsed_tokens: Generator<tokenizer.Token>,
    expected_tokens: [symbol, any][],
) {
    for (const expected of expected_tokens) {
        const parsed = parsed_tokens.next()?.value;
        assert.equal(
            parsed?.type,
            expected[0],
            `Expected token ${expected[0].description}: ${expected[1]} found ${parsed?.type.description}: ${parsed?.value}.`,
        );
        assert.equal(
            parsed?.value,
            expected[1],
            `Expected token ${expected[0].description}: ${expected[1]} found ${parsed?.type.description}: ${parsed?.value}.`,
        );
    }
}

suite("kicad.tokenizer.tokenize(): s-expression tokenizer", function () {
    test("with bare values", function () {
        const tokens = tokenizer.tokenize('1 a "c" 4');
        assert_tokens(tokens, [
            [NUMBER, 1],
            [ATOM, "a"],
            [STRING, "c"],
            [NUMBER, 4],
        ]);
    });

    test("with atoms", function () {
        let tokens = tokenizer.tokenize("(abc)");
        assert_tokens(tokens, [OPEN_TOKEN, [ATOM, "abc"], CLOSE_TOKEN]);
        tokens = tokenizer.tokenize("(abc def)");
        assert_tokens(tokens, [
            OPEN_TOKEN,
            [ATOM, "abc"],
            [ATOM, "def"],
            CLOSE_TOKEN,
        ]);
        tokens = tokenizer.tokenize("(abc (def))");
        assert_tokens(tokens, [
            OPEN_TOKEN,
            [ATOM, "abc"],
            OPEN_TOKEN,
            [ATOM, "def"],
            CLOSE_TOKEN,
            CLOSE_TOKEN,
        ]);
        tokens = tokenizer.tokenize("(a1 b2 c3 d4 e5)");
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

    test("with numbers", function () {
        let tokens = tokenizer.tokenize("(0)");
        assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, 0], CLOSE_TOKEN]);
        tokens = tokenizer.tokenize("(123)");
        assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, 123], CLOSE_TOKEN]);
        tokens = tokenizer.tokenize("(-123)");
        assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, -123], CLOSE_TOKEN]);
        tokens = tokenizer.tokenize("(-1234.5678)");
        assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, -1234.5678], CLOSE_TOKEN]);
        tokens = tokenizer.tokenize("(+1234.5678)");
        assert_tokens(tokens, [OPEN_TOKEN, [NUMBER, 1234.5678], CLOSE_TOKEN]);
    });

    test("with strings", function () {
        let tokens = tokenizer.tokenize('("Hello, world!")');
        assert_tokens(tokens, [
            OPEN_TOKEN,
            [STRING, "Hello, world!"],
            CLOSE_TOKEN,
        ]);

        tokens = tokenizer.tokenize('("a\\"b")');
        assert_tokens(tokens, [OPEN_TOKEN, [STRING, 'a\\"b'], CLOSE_TOKEN]);

        tokens = tokenizer.tokenize(
            `descr "Pololu Breakout 16-pin 15.2x20.3mm 0.6x0.8\\\\"`,
        );
        assert_tokens(tokens, [
            [ATOM, "descr"],
            [STRING, `Pololu Breakout 16-pin 15.2x20.3mm 0.6x0.8\\`],
        ]);
    });

    test("with base64", function () {
        const tokens = tokenizer.tokenize(
            "(6x84OPr6+j7y 0+6li2sAAAAASU/VORK5CYII=)",
        );

        assert_tokens(tokens, [
            OPEN_TOKEN,
            [ATOM, "6x84OPr6+j7y"],
            [ATOM, "0+6li2sAAAAASU/VORK5CYII="],
            CLOSE_TOKEN,
        ]);
    });

    test("with embedded data containing pipes", function () {
        const tokens = tokenizer.tokenize(
            "(data |KLUv/aCvzgcAAAAQiVBORw0KGgoAAAANSUhEUgAABiAAAANoCAYAAABJLCIrAAAABHNCSVQICAgI)",
        );
        assert_tokens(tokens, [
            OPEN_TOKEN,
            [ATOM, "data"],
            [
                ATOM,
                "|KLUv/aCvzgcAAAAQiVBORw0KGgoAAAANSUhEUgAABiAAAANoCAYAAABJLCIrAAAABHNCSVQICAgI",
            ],
            CLOSE_TOKEN,
        ]);
    });

    test("with pipe character in middle of atom", function () {
        const tokens = tokenizer.tokenize("(test |middle|end)");
        assert_tokens(tokens, [
            OPEN_TOKEN,
            [ATOM, "test"],
            [ATOM, "|middle|end"],
            CLOSE_TOKEN,
        ]);
    });
});

suite("kicad.tokenizer.listify()", function () {
    test("with simple lists", function () {
        const cases: [string, any[]][] = [
            ["(1 2 3)", [[1, 2, 3]]],
            ["(a b c)", [["a", "b", "c"]]],
            ["(1 a B)", [[1, "a", "B"]]],
            ['(meep 1 "two")', [["meep", 1, "two"]]],
            ["(a kebab-case)", [["a", "kebab-case"]]],
            ["(a D+)", [["a", "D+"]]],
        ];

        for (const [src, expected] of cases) {
            const l = tokenizer.listify(src);
            assert.deepEqual(l, expected);
        }
    });
    test("with nested lists", function () {
        const cases: [string, any[]][] = [
            ["(1 (2))", [[1, [2]]]],
            ["(1 (2 (a)) b (c))", [[1, [2, ["a"]], "b", ["c"]]]],
        ];

        for (const [src, expected] of cases) {
            const l = tokenizer.listify(src);
            assert.deepEqual(l, expected);
        }
    });
});
