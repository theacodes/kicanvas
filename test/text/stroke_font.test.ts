/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import { StrokeFont } from "../../src/text/stroke_font";
import { Vec2 } from "../../src/math/vec2";
import { Angle } from "../../src/math/angle";
import { TextStyle } from "../../src/text/font";
import { StrokeGlyph } from "../../src/text/glyph";

const font = StrokeFont.default();

suite("text.stroke_font.StrokeFont()", function () {
    test(".get_glyph()", function () {
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

    test(".get_interline()", function () {
        // Expected values here are pulled from KiCAD via debugging calls to respective StrokeFont methods.

        assert.closeTo(font.get_interline(38100, 1), 61722, 0.5);
        assert.closeTo(font.get_interline(12700, 1), 20574, 0.5);
    });

    test(".compute_overbar_vertical_position()", function () {
        assert.closeTo(
            font.compute_overbar_vertical_position(12700),
            17780,
            0.5,
        );
        // TODO: Test compute_underline_vertical_position, I wasn't able to get eeschema to trigger it.
    });

    test(".get_text_as_glyphs()", function () {
        // Expected values pulled from KiCAD via debugging to StrokeFont::GetTextAsGlyphs

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

    test(".get_text_as_glyphs() with rotated, italic", function () {
        // Expected values pulled from KiCAD via debugging to StrokeFont::GetTextAsGlyphs

        const text = "hello";
        const size = new Vec2(12700, 12700);
        const pos = new Vec2(863600, 1044067);
        const angle = Angle.from_degrees(90);
        const mirror = false;
        const origin = new Vec2(863600, 1066800);
        const style = new TextStyle();
        style.italic = true;

        const { bbox, glyphs, cursor } = font.get_text_as_glyphs(
            text,
            size,
            pos,
            angle,
            mirror,
            origin,
            style,
        );

        assert.closeTo(cursor.x, 910770, 0.5);
        assert.closeTo(cursor.y, 1044067, 0.5);

        /*
        {
            m_Pos = (x = 863600, y = 1044067)
            m_Size = (x = 44630, y = 12700)
            m_init = true
        }
        */
        assert.closeTo(bbox.x, 863600, 0.5);
        assert.closeTo(bbox.y, 1044067, 0.5);
        assert.closeTo(bbox.w, 44630, 0.5);
        assert.closeTo(bbox.h, 12700, 0.5);

        assert.equal(glyphs.length, 5);

        /*
        {
            [0] = size=4 {
                [0] = (x = 840262.23809523811, y = 1039510.3095238095)
                [1] = (x = 839657.47619047621, y = 1040644.2380952381)
                [2] = (x = 838447.95238095243, y = 1041097.8095238095)
                [3] = (x = 827562.23809523811, y = 1039737.0952380953)
            }
        }
        */
        const l_glyph = glyphs[2] as StrokeGlyph;
        assert.equal(l_glyph.strokes.length, 1);
        assert.equal(l_glyph.strokes[0]!.length, 4);
        assert.closeTo(l_glyph.strokes[0]![0]!.x, 840262.2, 0.5);
        assert.closeTo(l_glyph.strokes[0]![0]!.y, 1039510.3, 0.5);
        assert.closeTo(l_glyph.strokes[0]![1]!.x, 839657.5, 0.5);
        assert.closeTo(l_glyph.strokes[0]![1]!.y, 1040644.2, 0.5);
        assert.closeTo(l_glyph.strokes[0]![2]!.x, 838447.9, 0.5);
        assert.closeTo(l_glyph.strokes[0]![2]!.y, 1041097.8, 0.5);
        assert.closeTo(l_glyph.strokes[0]![3]!.x, 827562.2, 0.5);
        assert.closeTo(l_glyph.strokes[0]![3]!.y, 1039737.1, 0.5);
    });

    test(".get_line_extents()", function () {
        let limits = font.get_line_extents(
            "hello world",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 107019, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);

        limits = font.get_line_extents(
            "hello world",
            new Vec2(12700, 12700),
            2540,
            true,
            false,
        );

        assert.closeTo(limits.x, 109399, 0.5);
        assert.closeTo(limits.y, 19050, 0.5);
    });

    test(".get_line_extents() with markup", function () {
        let limits = font.get_line_extents(
            "hello ^{world} 1 2 3",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 150924, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);

        limits = font.get_line_extents(
            "hello _{world} 1 2 3",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 150924, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);

        limits = font.get_line_extents(
            "hello ~{world} 1 2 3",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 166164, 0.5);
        assert.closeTo(limits.y, 28862, 0.5);

        limits = font.get_line_extents(
            "hello ^{world} _{1 2 3}",
            new Vec2(12700, 12700),
            1588,
            false,
            false,
        );

        assert.closeTo(limits.x, 136230, 0.5);
        assert.closeTo(limits.y, 16670, 0.5);
    });
});
