/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { StrokeFont } from "../src/text/stroke_font";
import { Vec2 } from "../src/math/vec2";
import { Angle } from "../src/math/angle";
import { TextStyle } from "../src/text/font";
import { StrokeGlyph } from "../src/text/glyph";

const font = new StrokeFont();
font.load();

suite("base font", function () {
    test("break words", function () {
        let words = font["wordbreak_markup_text"](
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

        words = font["wordbreak_markup_text"](
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

    test("break lines", function () {
        // TODO
        font.linebreak_text(
            "hello world ^{1} 2 3",
            182880,
            new Vec2(12700, 12700),
            0,
            false,
            false,
        );
    });
});

suite("stroke font", function () {
    test("glyph data", function () {
        // Expected values here are pulled from KiCAD's memory after loading Newstroke.

        // space should have no strokes, but still have a bounding box.
        const space = font.get_glyph(" ");
        assert.equal(space.strokes.length, 0);
        assert.closeTo(space.bbox.w, 0.76190476190476186, Number.EPSILON);

        // "-"" should have one stroke
        const neg = font.get_glyph("-");
        assert.equal(neg.strokes.length, 1);
        assert.closeTo(
            neg.strokes[0]![0]!.x,
            0.23809523809523814,
            Number.EPSILON,
        );
        assert.closeTo(
            neg.strokes[0]![0]!.y,
            -0.42857142857142855,
            Number.EPSILON,
        );
        assert.closeTo(neg.strokes[0]![1]!.x, 1, Number.EPSILON);
        assert.closeTo(
            neg.strokes[0]![0]!.y,
            -0.42857142857142855,
            Number.EPSILON,
        );
        assert.closeTo(neg.bbox.x, 0, Number.EPSILON);
        assert.closeTo(neg.bbox.y, -0.42857142857142855, Number.EPSILON);
        assert.closeTo(neg.bbox.w, 1.2380952380952381, Number.EPSILON);
        assert.closeTo(neg.bbox.h, 0.42857142857142855, Number.EPSILON);

        // Note: only testing two glyphs here, but it's unlikely that these two would pass if others
        // were messed up. (I'm probably gonna live to regret writing that, aren't I?)
    });

    test("metrics methods", function () {
        // Expected values here are pulled from KiCAD via debugging calls to respective StrokeFont methods.

        assert.closeTo(font.get_interline(38100, 1), 61722, 0.5);
        assert.closeTo(font.get_interline(12700, 1), 20574, 0.5);
        assert.closeTo(
            font.compute_overbar_vertical_position(12700),
            17780,
            0.5,
        );
        // TODO: Test compute_underline_vertical_position, I wasn't able to get eeschema to trigger it.
    });

    test("get text as glyphs", function () {
        // Expected values pulled from KiCAD via debugging to StrokeFont::GetTextAsGlyphs, with the
        // note that we use mm instead of eeschema's scaled integers.

        const text = "text";
        const size = new Vec2(12700, 12700);
        const pos = new Vec2(304800, 302641);
        const angle = new Angle(0);
        const mirror = false;
        const origin = new Vec2(304800, 304800);
        const style = new TextStyle();

        const { bbox, glyphs, cursor } = font.get_text_as_glyphs(
            text,
            size,
            pos,
            angle,
            mirror,
            origin,
            style,
        );

        assert.closeTo(bbox.x, 304800, 0.5);
        assert.closeTo(bbox.y, 302641, 0.5);
        assert.closeTo(bbox.w, 33141, 0.5);
        assert.closeTo(bbox.h, 12700, 0.5);
        assert.closeTo(cursor.x, 340481, 0.5);
        assert.closeTo(cursor.y, 302641, 0.5);

        assert.equal(glyphs.length, 4);

        /*
        {
            [0] = size=2 {
                [0] = (x = 306009.52380952379, y = 293569.57142857142)
                [1] = (x = 310847.61904761905, y = 293569.57142857142)
            }
            [1] = size=5 {
                [0] = (x = 307823.80952380953, y = 289336.23809523811)
                [1] = (x = 307823.80952380953, y = 300221.95238095237)
                [2] = (x = 308428.57142857142, y = 301431.47619047621)
                [3] = (x = 309638.09523809527, y = 302036.23809523811)
                [4] = (x = 310847.61904761905, y = 302036.23809523811)
            }
            m_boundingBox = {
                m_Pos = (x = 304800, y = 302639.95238095237)
                m_Size = (x = 7257.1428571428569, y = 1.0476190476190474)
                m_init = true
            }
        }
        */
        const t_glyph = glyphs[0] as StrokeGlyph;
        assert.equal(t_glyph.strokes.length, 2);
        assert.equal(t_glyph.strokes[0]!.length, 2);
        assert.closeTo(t_glyph.strokes[0]![0]!.x, 306009.5, 0.5);
        assert.closeTo(t_glyph.strokes[0]![0]!.y, 293569.6, 0.5);
        assert.closeTo(t_glyph.strokes[0]![1]!.x, 310847.6, 0.5);
        assert.closeTo(t_glyph.strokes[0]![1]!.y, 293569.6, 0.5);
        assert.equal(t_glyph.strokes[1]!.length, 5);
        assert.closeTo(t_glyph.strokes[1]![0]!.x, 307823.8, 0.5);
        assert.closeTo(t_glyph.strokes[1]![0]!.y, 289336.2, 0.5);
        assert.closeTo(t_glyph.strokes[1]![1]!.x, 307823.8, 0.5);
        assert.closeTo(t_glyph.strokes[1]![1]!.y, 300221.9, 0.5);
        assert.closeTo(t_glyph.strokes[1]![2]!.x, 308428.6, 0.5);
        assert.closeTo(t_glyph.strokes[1]![2]!.y, 301431.5, 0.5);
        assert.closeTo(t_glyph.strokes[1]![3]!.x, 309638.1, 0.5);
        assert.closeTo(t_glyph.strokes[1]![3]!.y, 302036.2, 0.5);
        assert.closeTo(t_glyph.strokes[1]![4]!.x, 310847.6, 0.5);
        assert.closeTo(t_glyph.strokes[1]![4]!.y, 302036.2, 0.5);
    });

    test("string boundary limits", function () {
        let limits = font.string_boundary_limits(
            "hello world",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 107019, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);

        limits = font.string_boundary_limits(
            "hello world",
            new Vec2(12700, 12700),
            2540,
            true,
            false,
        );

        assert.closeTo(limits.x, 109399, 0.5);
        assert.closeTo(limits.y, 19050, 0.5);
    });

    test("string boundary limits w/ markup", function () {
        let limits = font.string_boundary_limits(
            "hello ^{world} 1 2 3",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 150924, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);

        limits = font.string_boundary_limits(
            "hello _{world} 1 2 3",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 150924, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);

        limits = font.string_boundary_limits(
            "hello ~{world} 1 2 3",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 166164, 0.5);
        assert.closeTo(limits.y, 28862, 0.5);

        limits = font.string_boundary_limits(
            "hello ^{world} _{1 2 3}",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        console.log(limits);
        assert.closeTo(limits.x, 136230, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);
    });
});