import {
    PolygonSet,
    PolylineSet,
    CircleSet,
    GeometrySet,
} from "../gfx/geometry.js";
import { Matrix3 } from "../math/matrix3.js";

export class WebGl2Renderer {
    #transform_stack = [Matrix3.identity()];
    #layers = [];
    #active_layer;

    constructor(canvas) {
        this.canvas = canvas;
    }

    async setup() {
        // just in case the browser still gives us a backbuffer with alpha,
        // set the background color of the canvas to black so that it behaves
        // correctly.
        this.canvas.style.backgroundColor = "black";

        let gl = this.canvas.getContext("webgl2", { alpha: false });
        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);

        // TODO: Pull background color from theme
        gl.clearColor(0.074, 0.071, 0.094, 1);
        gl.clearDepth(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        await PolygonSet.load_shader(gl);
        await PolylineSet.load_shader(gl);
        await CircleSet.load_shader(gl);
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
