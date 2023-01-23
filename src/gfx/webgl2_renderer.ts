/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { PrimitiveSet } from "./webgl_graphics";
import { Vec2 } from "../math/vec2.js";
import { RenderLayer, Renderer } from "./renderer.js";
import { Matrix3 } from "../math/matrix3.js";
import { Arc, Circle, Polygon, Polyline } from "./primitives";

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
        this.#active_layer = new WebGL2RenderLayer(
            this,
            name,
            depth,
            new PrimitiveSet(this.gl)
        );
    }

    end_layer(): RenderLayer {
        if (this.#active_layer == null) throw new Error("No active layer");

        this.#active_layer.geometry.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;

        return this.#layers.at(-1);
    }

    circle(circle: Circle) {
        if (this.#active_layer == null) throw new Error("No active layer");

        circle.center = this.state.matrix.transform(circle.center);

        this.#active_layer.geometry.add_circle(circle);

        this.add_object_points([
            circle.center.add(new Vec2(circle.radius, circle.radius)),
            circle.center.sub(new Vec2(circle.radius, circle.radius)),
        ]);
    }

    arc(arc: Arc) {
        // TODO
    }

    line(line: Polyline) {
        if (this.#active_layer == null) throw new Error("No active layer");

        line.points = Array.from(this.state.matrix.transform_all(line.points));

        this.#active_layer.geometry.add_line(line);

        // TODO: take width into account?
        this.add_object_points(line.points);
    }

    polygon(polygon: Polygon) {
        if (this.#active_layer == null) throw new Error("No active layer");

        polygon.points = Array.from(
            this.state.matrix.transform_all(polygon.points)
        );

        this.#active_layer.geometry.add_polygon(polygon);

        this.add_object_points(polygon.points);
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
        public geometry: PrimitiveSet
    ) {
        super(renderer, name, depth);
    }

    clear() {
        this.geometry.dispose();
    }

    draw(transform: Matrix3) {
        this.geometry.draw(transform, this.depth);
    }
}
