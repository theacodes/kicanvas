/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { Vec2 } from "../../src/base/math";
import { StrokeFont, TextStyle } from "../../src/kicad/text";

// Note: using StrokeFont as a concrete class to test base class methods.
const font = StrokeFont.default();

suite("text.font.Font()", function () {
    test(".wordbreak_markup()", function () {
        let words = font["wordbreak_markup"](
            "hello world 1 2 3",
            new Vec2(12700, 12700),
            new TextStyle(),
        );

        // TODO: Validate sizes with KiCAD data.
        assert.equal(words.length, 5);
        assert.equal(words[0]!.word, "hello");
        assert.equal(words[1]!.word, "world");
        assert.equal(words[2]!.word, "1");
        assert.equal(words[3]!.word, "2");
        assert.equal(words[4]!.word, "3");

        words = font["wordbreak_markup"](
            "hello world ^{1} 2 3",
            new Vec2(12700, 12700),
            new TextStyle(),
        );

        // Note: width reference values pulled from KiCAD debugging
        assert.equal(words.length, 6);
        assert.equal(words[0]!.word, "hello");
        assert.equal(Math.round(words[0]!.width), 47170);
        assert.equal(words[1]!.word, "world");
        assert.equal(Math.round(words[1]!.width), 50799);
        assert.equal(words[2]!.word, " ");
        assert.equal(Math.round(words[2]!.width), 7620);
        assert.equal(words[3]!.word, "^{1}");
        assert.equal(Math.round(words[3]!.width), 8467);
        assert.equal(words[4]!.word, "2");
        assert.equal(Math.round(words[4]!.width), 12095);
        assert.equal(words[5]!.word, "3");
        assert.equal(Math.round(words[5]!.width), 12095);
    });

    test(".break_lines()", function () {
        // TODO
        font.break_lines(
            "hello world ^{1} 2 3",
            182880,
            new Vec2(12700, 12700),
            0,
            false,
            false,
        );
    });
});
