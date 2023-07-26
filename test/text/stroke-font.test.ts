/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { AssertionError, assert } from "@esm-bundle/chai";

import { Angle, Vec2 } from "../../src/base/math";
import { Polyline } from "../../src/graphics";
import {
    StrokeFont,
    StrokeGlyph,
    TextAttributes,
    TextStyle,
} from "../../src/kicad/text";
import { NullRenderer } from "../../src/graphics/null-renderer";

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

    test(".draw() simple", function () {
        const renderer = new NullRenderer();
        const attributes = new TextAttributes();

        attributes.h_align = "left";
        attributes.v_align = "bottom";
        attributes.stroke_width = 1524;
        attributes.multiline = true;
        attributes.size = new Vec2(12700, 12700);

        renderer.start_layer("test");

        font.draw(renderer, "abc", new Vec2(0, 0), attributes);

        const layer = renderer.end_layer();
        const shapes = layer.shapes;

        // Reference data from KiCAD debugging.
        assert.equal(shapes.length, 5);

        let stroke = (shapes[0] as Polyline).points;
        assert_vec(stroke[0], 8466.6666666666661, -2763.7619047619046);
        assert_vec(stroke[1], 8466.6666666666661, -9416.1428571428569);
        assert_vec(stroke[2], 7861.9047619047624, -10625.666666666666);
        assert_vec(stroke[3], 6652.3809523809514, -11230.428571428571);
        assert_vec(stroke[4], 4233.333333333333, -11230.428571428571);
        assert_vec(stroke[5], 3023.8095238095239, -10625.666666666666);

        stroke = (shapes[1] as Polyline).points;
        assert_vec(stroke[0], 8466.6666666666661, -3368.5238095238092);
        assert_vec(stroke[1], 7257.1428571428569, -2763.7619047619046);
        assert_vec(stroke[2], 4233.333333333333, -2763.7619047619046);
        assert_vec(stroke[3], 3023.8095238095239, -3368.5238095238092);
        assert_vec(stroke[4], 2419.0476190476188, -4578.0476190476184);
        assert_vec(stroke[5], 2419.0476190476188, -5787.5714285714284);
        assert_vec(stroke[6], 3023.8095238095239, -6997.0952380952376);
        assert_vec(stroke[7], 4233.333333333333, -7601.8571428571422);
        assert_vec(stroke[8], 7257.1428571428569, -7601.8571428571422);
        assert_vec(stroke[9], 8466.6666666666661, -8206.6190476190477);

        stroke = (shapes[2] as Polyline).points;
        assert_vec(stroke[0], 14513.809523809523, -2763.7619047619046);
        assert_vec(stroke[1], 14513.809523809523, -15463.761904761903);

        stroke = (shapes[3] as Polyline).points;
        assert_vec(stroke[0], 14513.809523809523, -10625.666666666666);
        assert_vec(stroke[1], 15723.333333333332, -11230.428571428571);
        assert_vec(stroke[2], 18142.38095238095, -11230.428571428571);
        assert_vec(stroke[3], 19351.904761904763, -10625.666666666666);
        assert_vec(stroke[4], 19956.666666666664, -10020.904761904763);
        assert_vec(stroke[5], 20561.428571428572, -8811.3809523809505);
        assert_vec(stroke[6], 20561.428571428572, -5182.8095238095239);
        assert_vec(stroke[7], 19956.666666666664, -3973.2857142857142);
        assert_vec(stroke[8], 19351.904761904763, -3368.5238095238092);
        assert_vec(stroke[9], 18142.38095238095, -2763.7619047619046);
        assert_vec(stroke[10], 15723.333333333332, -2763.7619047619046);
        assert_vec(stroke[11], 14513.809523809523, -3368.5238095238092);

        stroke = (shapes[4] as Polyline).points;
        assert_vec(stroke[0], 31446.666666666664, -3368.5238095238092);
        assert_vec(stroke[1], 30237.142857142855, -2763.7619047619046);
        assert_vec(stroke[2], 27818.095238095237, -2763.7619047619046);
        assert_vec(stroke[3], 26608.571428571428, -3368.5238095238092);
        assert_vec(stroke[4], 26003.809523809523, -3973.2857142857142);
        assert_vec(stroke[5], 25399.047619047618, -5182.8095238095239);
        assert_vec(stroke[6], 25399.047619047618, -8811.3809523809505);
        assert_vec(stroke[7], 26003.809523809523, -10020.904761904763);
        assert_vec(stroke[8], 26608.571428571428, -10625.666666666666);
        assert_vec(stroke[9], 27818.095238095237, -11230.428571428571);
        assert_vec(stroke[10], 30237.142857142855, -11230.428571428571);
        assert_vec(stroke[11], 31446.666666666664, -10625.666666666666);
    });

    test(".draw() multiline", function () {
        const renderer = new NullRenderer();
        const attributes = new TextAttributes();

        attributes.h_align = "left";
        attributes.v_align = "bottom";
        attributes.stroke_width = 1524;
        attributes.multiline = true;
        attributes.size = new Vec2(12700, 12700);

        renderer.start_layer("test");

        font.draw(renderer, "ab\nc", new Vec2(0, 0), attributes);

        const layer = renderer.end_layer();
        const shapes = layer.shapes;

        // Reference data from KiCAD debugging.
        assert.equal(shapes.length, 5);

        let stroke = (shapes[0] as Polyline).points;
        assert_vec(stroke[0], 8466.6666666666661, -23337.761904761905);
        assert_vec(stroke[1], 8466.6666666666661, -29990.142857142855);
        assert_vec(stroke[2], 7861.9047619047624, -31199.666666666664);
        assert_vec(stroke[3], 6652.3809523809514, -31804.428571428572);
        assert_vec(stroke[4], 4233.333333333333, -31804.428571428572);
        assert_vec(stroke[5], 3023.8095238095239, -31199.666666666664);

        stroke = (shapes[1] as Polyline).points;
        assert_vec(stroke[0], 8466.6666666666661, -23942.523809523809);
        assert_vec(stroke[1], 7257.1428571428569, -23337.761904761905);
        assert_vec(stroke[2], 4233.333333333333, -23337.761904761905);
        assert_vec(stroke[3], 3023.8095238095239, -23942.523809523809);
        assert_vec(stroke[4], 2419.0476190476188, -25152.047619047618);
        assert_vec(stroke[5], 2419.0476190476188, -26361.571428571428);
        assert_vec(stroke[6], 3023.8095238095239, -27571.095238095237);
        assert_vec(stroke[7], 4233.333333333333, -28175.857142857141);
        assert_vec(stroke[8], 7257.1428571428569, -28175.857142857141);
        assert_vec(stroke[9], 8466.6666666666661, -28780.619047619046);

        stroke = (shapes[2] as Polyline).points;
        assert_vec(stroke[0], 14513.809523809523, -23337.761904761905);
        assert_vec(stroke[1], 14513.809523809523, -36037.761904761901);

        stroke = (shapes[3] as Polyline).points;
        assert_vec(stroke[0], 14513.809523809523, -31199.666666666664);
        assert_vec(stroke[1], 15723.333333333332, -31804.428571428572);
        assert_vec(stroke[2], 18142.38095238095, -31804.428571428572);
        assert_vec(stroke[3], 19351.904761904763, -31199.666666666664);
        assert_vec(stroke[4], 19956.666666666664, -30594.904761904763);
        assert_vec(stroke[5], 20561.428571428572, -29385.38095238095);
        assert_vec(stroke[6], 20561.428571428572, -25756.809523809523);
        assert_vec(stroke[7], 19956.666666666664, -24547.285714285714);
        assert_vec(stroke[8], 19351.904761904763, -23942.523809523809);
        assert_vec(stroke[9], 18142.38095238095, -23337.761904761905);
        assert_vec(stroke[10], 15723.333333333332, -23337.761904761905);
        assert_vec(stroke[11], 14513.809523809523, -23942.523809523809);

        stroke = (shapes[4] as Polyline).points;
        assert_vec(stroke[0], 8466.6666666666661, -3368.5238095238092);
        assert_vec(stroke[1], 7257.1428571428569, -2763.7619047619046);
        assert_vec(stroke[2], 4838.0952380952376, -2763.7619047619046);
        assert_vec(stroke[3], 3628.5714285714284, -3368.5238095238092);
        assert_vec(stroke[4], 3023.8095238095239, -3973.2857142857142);
        assert_vec(stroke[5], 2419.0476190476188, -5182.8095238095239);
        assert_vec(stroke[6], 2419.0476190476188, -8811.3809523809505);
        assert_vec(stroke[7], 3023.8095238095239, -10020.904761904763);
        assert_vec(stroke[8], 3628.5714285714284, -10625.666666666666);
        assert_vec(stroke[9], 4838.0952380952376, -11230.428571428571);
        assert_vec(stroke[10], 7257.1428571428569, -11230.428571428571);
        assert_vec(stroke[11], 8466.6666666666661, -10625.666666666666);
    });
});

const assert_vec = (
    v: { x: number; y: number } | undefined,
    x: number,
    y: number,
    delta = 0.5,
) => {
    if (!v) {
        throw new AssertionError("Expected vector, got null or undefined");
    }
    assert.closeTo(v.x * 10000, x, delta);
    assert.closeTo(v.y * 10000, y, delta);
};
