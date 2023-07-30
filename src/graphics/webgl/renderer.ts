/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../../base/color";
import { Angle, Matrix3, Vec2 } from "../../base/math";
import { RenderLayer, Renderer } from "../renderer";
import { Arc, Circle, Polygon, Polyline } from "../shapes";
import { PrimitiveSet } from "./vector";

/**
 * WebGL2-based renderer
 */
export class WebGL2Renderer extends Renderer {
    /** Graphics layers */
    #layers: WebGL2RenderLayer[] = [];

    /** The layer currently being drawn to. */
    #active_layer: WebGL2RenderLayer | null;

    /** Projection matrix for clip -> screen */
    projection_matrix: Matrix3 = Matrix3.identity();

    /** WebGL backend */
    gl?: WebGL2RenderingContext;

    /**
     * Create a new WebGL2Renderer
     */
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
    }

    /**
     * Create and configure the WebGL2 context.
     */
    override async setup() {
        const gl = this.canvas.getContext("webgl2", { alpha: false });

        if (gl == null) {
            throw new Error("Unable to create WebGL2 context");
        }

        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);

        gl.clearColor(...this.background_color.to_array());
        gl.clearDepth(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.update_canvas_size();

        await PrimitiveSet.load_shaders(gl);
    }

    override dispose() {
        for (const layer of this.layers) {
            layer.dispose();
        }
        this.gl = undefined;
    }

    override update_canvas_size() {
        if (!this.gl) {
            return;
        }

        const dpr = window.devicePixelRatio;
        const rect = this.canvas.getBoundingClientRect();

        const logical_w = rect.width;
        const logical_h = rect.height;
        const pixel_w = Math.round(rect.width * dpr);
        const pixel_h = Math.round(rect.height * dpr);

        if (this.canvas_size.x == pixel_w && this.canvas_size.y == pixel_h) {
            return;
        }

        this.canvas.width = pixel_w;
        this.canvas.height = pixel_h;

        this.gl.viewport(0, 0, pixel_w, pixel_h);
        this.projection_matrix = Matrix3.orthographic(logical_w, logical_h);
    }

    override clear_canvas() {
        if (this.gl == null) throw new Error("Uninitialized");

        // Upate canvas size and projection matrix if needed
        this.update_canvas_size();

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    override start_layer(name: string, depth = 0) {
        if (this.gl == null) throw new Error("Uninitialized");
        this.#active_layer = new WebGL2RenderLayer(
            this,
            name,
            new PrimitiveSet(this.gl),
        );
    }

    override end_layer(): RenderLayer {
        if (this.#active_layer == null) throw new Error("No active layer");

        this.#active_layer.geometry.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;

        return this.#layers.at(-1)!;
    }

    override arc(
        arc_or_center: Arc | Vec2,
        radius?: number,
        start_angle?: Angle,
        end_angle?: Angle,
        width?: number,
        color?: Color,
    ): void {
        super.prep_arc(
            arc_or_center,
            radius,
            start_angle,
            end_angle,
            width,
            color,
        );
    }

    override circle(
        circle_or_center: Circle | Vec2,
        radius?: number,
        color?: Color,
    ): void {
        const circle = super.prep_circle(circle_or_center, radius, color);

        if (!circle.color) {
            return;
        }

        this.#active_layer!.geometry.add_circle(circle);
    }

    override line(
        line_or_points: Polyline | Vec2[],
        width?: number,
        color?: Color,
    ): void {
        const line = super.prep_line(line_or_points, width, color);

        if (!line.color) {
            return;
        }

        this.#active_layer!.geometry.add_line(line);
    }

    override polygon(polygon_or_points: Polygon | Vec2[], color?: Color): void {
        const polygon = super.prep_polygon(polygon_or_points, color);

        if (!polygon.color) {
            return;
        }

        this.#active_layer!.geometry.add_polygon(polygon);
    }

    override get layers(): Iterable<RenderLayer> {
        const layers = this.#layers;
        return {
            *[Symbol.iterator]() {
                for (const layer of layers) {
                    yield layer;
                }
            },
        };
    }

    override remove_layer(layer: WebGL2RenderLayer) {
        const idx = this.#layers.indexOf(layer);
        if (idx == -1) {
            return;
        }
        this.#layers.splice(idx, 1);
    }
}

class WebGL2RenderLayer extends RenderLayer {
    constructor(
        public override readonly renderer: WebGL2Renderer,
        public override readonly name: string,
        public geometry: PrimitiveSet,
    ) {
        super(renderer, name);
    }

    override dispose(): void {
        this.clear();
    }

    clear() {
        this.geometry?.dispose();
    }

    render(transform: Matrix3, depth: number, global_alpha = 1) {
        const gl = this.renderer.gl!;
        const total_transform =
            this.renderer.projection_matrix.multiply(transform);

        if (this.composite_operation != "source-over") {
            gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
        }

        this.geometry.render(total_transform, depth, global_alpha);

        if (this.composite_operation != "source-over") {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
    }
}
