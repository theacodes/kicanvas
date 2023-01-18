import { PrimitiveSet } from "./primitives.js";
import { Matrix3 } from "../math/matrix3.js";
import { f4_to_rgba } from "./colorspace.js";
import { BBox } from "../math/bbox.js";
import { Vec2 } from "../math/vec2.js";

export class WebGl2Renderer {
    #transform_stack = [Matrix3.identity()];
    #layers = [];
    #active_layer;
    #background_color;
    #current_object_points;

    constructor(canvas, background_color) {
        this.canvas = canvas;
        this.#background_color = background_color;
    }

    async setup() {
        // just in case the browser still gives us a backbuffer with alpha,
        // set the background color of the canvas to black so that it behaves
        // correctly.
        this.canvas.style.backgroundColor = f4_to_rgba(this.#background_color);

        let gl = this.canvas.getContext("webgl2", { alpha: false });
        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);

        // TODO: Pull background color from theme
        gl.clearColor(...this.#background_color);
        gl.clearDepth(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.set_viewport(0, 0, this.canvas.width, this.canvas.height);

        await PrimitiveSet.load_shaders(gl);
    }

    set_viewport(x, y, w, h) {
        this.gl.viewport(x, y, w, h);
    }

    clear_canvas() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    get_transform() {
        return this.#transform_stack.at(-1);
    }

    set_transform(mat) {
        this.#transform_stack = mat ? [mat] : [Matrix3.identity()];
    }

    push_transform(mat) {
        this.#transform_stack.push(this.get_transform().multiply(mat));
    }

    pop_transform() {
        this.#transform_stack.pop();
    }

    start_layer() {
        this.#active_layer = new PrimitiveSet(this.gl);
    }

    end_layer() {
        this.#active_layer.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;
        return this.#layers.at(-1);
    }

    start_object() {
        this.#current_object_points = [];
    }

    end_object() {
        const bbox = BBox.from_points(this.#current_object_points);
        this.#current_object_points = null;
        return bbox;
    }

    circle(point, radius, color) {
        point = this.get_transform().transform(point);
        this.#active_layer.add_circle(point, radius, color);
        this.#current_object_points?.push(
            point.add(new Vec2(radius, radius)),
            point.sub(new Vec2(radius, radius))
        );
    }

    line(points, width, color) {
        points = Array.from(this.get_transform().transform_all(points));
        this.#active_layer.add_line(points, width, color);
        // TODO: take width into account?
        this.#current_object_points?.push(...points);
    }

    polygon(points, color) {
        points = Array.from(this.get_transform().transform_all(points));
        this.#active_layer.add_polygon(points, color);

        if (this.#current_object_points != null) {
            this.#current_object_points =
                this.#current_object_points.concat(points);
        }
    }

    *layers() {
        for (const layer of this.#layers) {
            yield layer;
        }
    }
}
