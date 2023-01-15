import { default as layers } from "./layers.js";
import { Painter } from "./painter.js";
import { GeometrySet } from "../gfx/vg.js";
import { Matrix3 } from "../math/matrix3.js";

export class View {
    constructor(gl, board) {
        this.gfx = new CanvasBackend(gl);
        this.painter = new Painter(this.gfx);
        this.board = board;
        this.layers = layers();
        this.#assign_items_to_layers();
        this.#paint();
    }

    #assign_items_to_layers() {
        for (const item of this.board.items) {
            for (const layer_name of this.painter.get_layers_for(item)) {
                this.layers.get(layer_name).items.push(item);
            }
        }
    }

    #paint() {
        for (const [_, layer] of this.layers) {
            this.painter.paint_layer(layer);
        }
    }

    draw(matrix) {
        const layers = Array.from(this.gfx.layers()).reverse();
        for (const layer of layers) {
            layer.draw(matrix);
        }
    }
}

export class CanvasBackend {
    #matrix_stack = [Matrix3.identity()];
    #layers = [];
    #active_layer;

    constructor(gl) {
        this.gl = gl;
    }

    get_transform() {
        return this.#matrix_stack.at(-1);
    }

    set_transform(mat) {
        this.#matrix_stack = mat ? [mat] : [Matrix3.identity()];
    }

    push_transform(mat) {
        this.#matrix_stack.push(this.get_transform().copy().multiply(mat));
    }

    pop_transform() {
        this.#matrix_stack.pop();
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
