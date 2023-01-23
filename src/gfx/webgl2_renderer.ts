/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { PrimitiveSet } from "./primitives.js";
import { Color } from "./color.js";
import { Vec2 } from "../math/vec2.js";
import { RenderLayer, Renderer } from "./renderer.js";
import { Matrix3 } from "../math/matrix3.js";

/**
 * WebGL2-based renderer
 */
export class WebGL2Renderer extends Renderer {
    /** Graphics layers */
    #layers: WebGL2RenderLayer[] = [];

    /** The layer currently being drawn to. */
    #active_layer: WebGL2RenderLayer = null;

    /** WebGL backend */
    gl: WebGL2RenderingContext;

    /**
     * Create a new WebGL2Renderer
     */
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
    }

    /**
     * Create and configure the WebGL2 context.
     */
    async setup() {
        await super.setup();

        // just in case the browser still gives us a backbuffer with alpha,
        // set the background color of the canvas to black so that it behaves
        // correctly.
        this.canvas.style.backgroundColor = this.background_color.to_css();

        const gl = this.canvas.getContext("webgl2", { alpha: false });

        if (gl == null) {
            throw new Error("Unable to create WebGL2 context");
        }

        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);

        gl.clearColor(...this.background_color.to_array());
        gl.clearDepth(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.set_viewport(0, 0, this.canvas.width, this.canvas.height);

        await PrimitiveSet.load_shaders(gl);
    }

    /**
     * Update the WebGL2 context's viewport. Should be called whenever the size
     * of the underlying canvas element changes.
     */
    set_viewport(x: number, y: number, w: number, h: number) {
        if (this.gl == null) throw new Error("Uninitialized");
        this.gl.viewport(x, y, w, h);
    }

    clear_canvas() {
        if (this.gl == null) throw new Error("Uninitialized");
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    start_layer(name: string, depth = 0) {
        if (this.gl == null) throw new Error("Uninitialized");
        this.#active_layer = new WebGL2RenderLayer(this, name, depth, new PrimitiveSet(this.gl));
    }

    end_layer(): RenderLayer {
        if (this.#active_layer == null) throw new Error("No active layer");

        this.#active_layer.commands.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;

        return this.#layers.at(-1);
    }

    circle(point: Vec2, radius: number, color: Color) {
        if (this.#active_layer == null) throw new Error("No active layer");

        point = this.state.matrix.transform(point);

        this.#active_layer.commands.add_circle(point, radius, color);

        this.add_object_points([
            point.add(new Vec2(radius, radius)),
            point.sub(new Vec2(radius, radius)),
        ]);
    }

    arc(
        point: Vec2,
        radius: number,
        start_angle: number,
        end_angle: number,
        width: number,
        color: Color
    ) {
        // TODO
    }

    line(points: Vec2[], width: number, color: Color) {
        if (this.#active_layer == null) throw new Error("No active layer");

        points = Array.from(this.state.matrix.transform_all(points));

        this.#active_layer.commands.add_line(points, width, color);

        // TODO: take width into account?
        this.add_object_points(points);
    }

    polygon(points: Vec2[], color: Color) {
        if (this.#active_layer == null) throw new Error("No active layer");

        points = Array.from(this.state.matrix.transform_all(points));

        this.#active_layer.commands.add_polygon(points, color);

        this.add_object_points(points);
    }

    get layers(): Iterable<RenderLayer> {
        const layers = this.#layers;
        return {
            *[Symbol.iterator]() {
                for (const layer of layers) {
                    yield layer;
                }
            },
        };
    }
}

class WebGL2RenderLayer extends RenderLayer {
    constructor(
        public readonly renderer: Renderer,
        public readonly name: string,
        public readonly depth: number,
        public commands: PrimitiveSet
    ) {
        super(renderer, name, depth);
    }

    clear() {
        this.commands.dispose();
    }

    draw(transform: Matrix3) {
        this.commands.draw(transform, this.depth);
    }
}
