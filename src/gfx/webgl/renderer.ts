/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { PrimitiveSet } from "./vector";
import { RenderLayer, Renderer } from "../renderer";
import { Matrix3 } from "../../math/matrix3";
import { Circle, Polygon, Polyline } from "../shapes";

/**
 * WebGL2-based renderer
 */
export class WebGL2Renderer extends Renderer {
    /** Graphics layers */
    #layers: WebGL2RenderLayer[] = [];

    /** The layer currently being drawn to. */
    #active_layer: WebGL2RenderLayer = null;

    /** Projection matrix for clip -> screen */
    projection_matrix: Matrix3;

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

        this.update_viewport();

        await PrimitiveSet.load_shaders(gl);
    }

    update_viewport() {
        if (!this.gl) {
            return;
        }

        const dpr = window.devicePixelRatio;
        const rect = this.canvas.getBoundingClientRect();

        const logical_w = rect.width;
        const logical_h = rect.height;
        const pixel_w = Math.round(rect.width * dpr);
        const pixel_h = Math.round(rect.height * dpr);

        this.canvas.width = pixel_w;
        this.canvas.height = pixel_h;

        this.gl.viewport(0, 0, pixel_w, pixel_h);
        this.projection_matrix = Matrix3.orthographic(logical_w, logical_h);
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
        super.circle(circle);

        if (!circle.color) {
            return;
        }

        this.#active_layer.geometry.add_circle(circle);
    }

    line(line: Polyline) {
        super.line(line);

        if (!line.color) {
            return;
        }

        this.#active_layer.geometry.add_line(line);
    }

    polygon(polygon: Polygon) {
        super.polygon(polygon);

        if (!polygon.color) {
            return;
        }

        this.#active_layer.geometry.add_polygon(polygon);
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
        public readonly renderer: WebGL2Renderer,
        public readonly name: string,
        public readonly depth: number,
        public geometry: PrimitiveSet
    ) {
        super(renderer, name, depth);
    }

    dispose(): void {
        this.clear();
    }

    clear() {
        this.geometry?.dispose();
    }

    render(transform: Matrix3) {
        const total_transform =
            this.renderer.projection_matrix.multiply(transform);
        this.geometry.render(total_transform, this.depth);
    }
}
