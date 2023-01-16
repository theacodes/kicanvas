import {
    PolygonSet,
    PolylineSet,
    CircleSet,
    GeometrySet,
} from "../gfx/geometry.js";
import { Matrix3 } from "../math/matrix3.js";
import { f4_to_rgba } from "../gfx/colorspace.js";

export class WebGl2Renderer {
    #transform_stack = [Matrix3.identity()];
    #layers = [];
    #active_layer;
    #background_color;

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

        await PolygonSet.load_shader(gl);
        await PolylineSet.load_shader(gl);
        await CircleSet.load_shader(gl);
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
        this.#transform_stack.push(this.get_transform().copy().multiply(mat));
    }

    pop_transform() {
        this.#transform_stack.pop();
    }

    start_layer() {
        this.#active_layer = new GeometrySet(this.gl);
    }

    end_layer() {
        this.#active_layer.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;
        return this.#layers.at(-1);
    }

    circle(point, radius, color) {
        point = this.get_transform().transform(point);
        this.#active_layer.add_circle(point, radius, color);
    }

    line(points, width, color) {
        points = Array.from(this.get_transform().transform_all(points));
        this.#active_layer.add_line(points, width, color);
    }

    polygon(points, color) {
        points = Array.from(this.get_transform().transform_all(points));
        this.#active_layer.add_polygon(points, color);
    }

    *layers() {
        for (const layer of this.#layers) {
            yield layer;
        }
    }
}
