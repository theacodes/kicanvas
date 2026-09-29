import { assert } from "chai";
import { Color } from "../../src/base/color";
import { Matrix3, Vec2 } from "../../src/base/math";
import { split_bridged_polygon } from "../../src/graphics/polygon-rings";
import { Polygon } from "../../src/graphics/shapes";
import { WebGL2Renderer } from "../../src/graphics/webgl/renderer";
import { PolygonSet } from "../../src/graphics/webgl/vector";

function rectangle(x1: number, y1: number, x2: number, y2: number) {
    return [
        new Vec2(x1, y1),
        new Vec2(x2, y1),
        new Vec2(x2, y2),
        new Vec2(x1, y2),
    ];
}

function bridged(outer: Vec2[], ...holes: Vec2[][]) {
    const points = [...outer, outer[0]!];
    for (const hole of holes) {
        points.push(...hole, hole[0]!, outer[0]!);
    }
    return points;
}

const outer = () => rectangle(-0.9, -0.9, 0.9, 0.9);
const hole = () => rectangle(-0.4, -0.4, 0.4, 0.4).reverse();

suite("graphics: bridged polygon contours", function () {
    test("preserves ordinary polygons and ambiguous same-winding contours", function () {
        const simple = outer();
        assert.strictEqual(split_bridged_polygon(simple)[0], simple);
        const islands = bridged(outer(), rectangle(-0.4, -0.4, 0.4, 0.4));
        assert.deepEqual(split_bridged_polygon(islands), [islands]);
    });

    test("splits multiple holes without changing source coordinates or winding", function () {
        const exterior = outer();
        const holes = [hole(), rectangle(0.5, 0.5, 0.7, 0.7).reverse()];
        const source = bridged(exterior, ...holes);
        const snapshot = source.slice();
        const rings = split_bridged_polygon(source);
        assert.deepEqual(rings, [exterior, ...holes]);
        assert.deepEqual(source, snapshot);
        assert.equal(split_bridged_polygon(source.slice().reverse()).length, 3);
    });
});

suite("graphics: WebGL polygon stencil", function () {
    let renderer: WebGL2Renderer;
    let gl: WebGL2RenderingContext;
    let canvas: HTMLCanvasElement;

    suiteSetup(async function () {
        canvas = document.createElement("canvas");
        canvas.style.width = "64px";
        canvas.style.height = "64px";
        document.body.append(canvas);
        renderer = new WebGL2Renderer(canvas);
        await renderer.setup();
        gl = renderer.gl!;
        assert.isAbove(gl.getParameter(gl.STENCIL_BITS), 0);
    });

    suiteTeardown(function () {
        renderer.dispose();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
    });

    setup(function () {
        gl.disable(gl.STENCIL_TEST);
        gl.stencilMask(0xff);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        renderer.clear_canvas();
    });

    function draw(polygons: Polygon[], depth = 0.5) {
        const set = new PolygonSet(gl);
        try {
            set.set(polygons);
            set.shader.bind();
            set.shader["u_matrix"].mat3f(false, Matrix3.identity().elements);
            set.shader["u_depth"].f1(depth);
            set.shader["u_alpha"].f1(1);
            set.render();
        } finally {
            set.dispose();
        }
    }

    function pixel(x: number, y: number) {
        const rgba = new Uint8Array(4);
        gl.readPixels(
            Math.floor(((x + 1) * gl.drawingBufferWidth) / 2),
            Math.floor(((y + 1) * gl.drawingBufferHeight) / 2),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            rgba,
        );
        return Array.from(rgba.subarray(0, 3));
    }

    function assert_stencil_empty() {
        // Paint only nonzero stencil pixels. A clean mask must leave the
        // entire framebuffer unchanged, including depth-occluded regions.
        const before = new Uint8Array(
            gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
        );
        const after = new Uint8Array(before.length);
        gl.readPixels(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            before,
        );
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        gl.disable(gl.DEPTH_TEST);
        draw([new Polygon(rectangle(-1, -1, 1, 1), new Color(1, 0, 1))]);
        gl.readPixels(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            after,
        );
        assert.deepEqual(after, before);
        assert.equal(gl.getError(), gl.NO_ERROR);
    }

    test("renders holes over existing copper and shades transparency once", function () {
        draw([new Polygon(outer(), new Color(0, 0, 1))], 0.25);
        draw([new Polygon(bridged(outer(), hole()), new Color(1, 0, 0, 0.5))]);
        assert.deepEqual(pixel(0, 0), [0, 0, 255]);
        const copper = pixel(0.6, 0);
        assert.closeTo(copper[0]!, 128, 1);
        assert.equal(copper[1], 0);
        assert.closeTo(copper[2]!, 127, 1);
        assert_stencil_empty();
    });

    test("subtracts the union of overlapping and nested holes", function () {
        const holes = [
            rectangle(-0.6, -0.5, 0.2, 0.5).reverse(),
            rectangle(-0.2, -0.5, 0.6, 0.5).reverse(),
            rectangle(-0.1, -0.1, 0.1, 0.1).reverse(),
        ];
        draw([new Polygon(bridged(outer(), ...holes), Color.white)]);
        assert.deepEqual(pixel(-0.4, 0), [0, 0, 0]);
        assert.deepEqual(pixel(0, 0.3), [0, 0, 0]);
        assert.deepEqual(pixel(0, 0), [0, 0, 0]);
        assert.deepEqual(pixel(0.7, 0), [255, 255, 255]);
        assert_stencil_empty();
    });

    test("keeps ordinary polygons before and after masked polygons", function () {
        draw([
            new Polygon(rectangle(-0.2, -0.2, 0.2, 0.2), new Color(0, 1, 0)),
            new Polygon(bridged(outer(), hole()), new Color(1, 0, 0)),
            new Polygon(rectangle(-0.35, -0.2, -0.25, 0.2), new Color(0, 0, 1)),
        ]);
        assert.deepEqual(pixel(0, 0), [0, 255, 0]);
        assert.deepEqual(pixel(-0.3, 0), [0, 0, 255]);
        assert.deepEqual(pixel(0.6, 0), [255, 0, 0]);
        assert_stencil_empty();
    });

    test("clears depth-occluded masks and preserves subsequent polygon fills", function () {
        draw(
            [new Polygon(rectangle(-0.9, -0.9, 0, 0.9), new Color(0, 1, 0))],
            0.75,
        );
        draw([
            new Polygon(bridged(outer(), hole()), new Color(1, 0, 0)),
            new Polygon(
                bridged(
                    rectangle(-0.3, -0.3, 0.3, 0.3),
                    rectangle(-0.1, -0.1, 0.1, 0.1).reverse(),
                ),
                new Color(0, 0, 1),
            ),
        ]);
        assert.deepEqual(pixel(-0.6, 0), [0, 255, 0]);
        assert.deepEqual(pixel(0.6, 0), [255, 0, 0]);
        assert.deepEqual(pixel(0.2, 0), [0, 0, 255]);
        assert.deepEqual(pixel(0.05, 0), [0, 0, 0]);
        assert_stencil_empty();
    });

    test("restores color and depth write state", function () {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.colorMask(true, false, true, false);
        draw([new Polygon(bridged(outer(), hole()), Color.white)]);
        assert.isFalse(gl.isEnabled(gl.DEPTH_TEST));
        assert.isFalse(gl.getParameter(gl.DEPTH_WRITEMASK));
        assert.deepEqual(gl.getParameter(gl.COLOR_WRITEMASK), [
            true,
            false,
            true,
            false,
        ]);
        assert.isFalse(gl.isEnabled(gl.STENCIL_TEST));
        assert.deepEqual(pixel(0.6, 0), [255, 0, 255]);
    });
});
