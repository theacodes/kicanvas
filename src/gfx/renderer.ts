/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox } from "../math/bbox.js";
import { Matrix3 } from "../math/matrix3.js";
import { Vec2 } from "../math/vec2.js";
import { Color } from "./color.js";
import { TextShaper } from "./text.js";

/**
 * KiCanvas' abstraction over various graphics backends.
 *
 * In general, KiCanvas uses a retained-mode rendering system. That is,
 * drawing commands are issued to the renderer by a "painter" and the renderer
 * does not immediately draw the specified graphics. Instead, the renderer will
 * compile all of the drawing commands together into a "layer". These layers
 * can be actually rendered later.
 *
 * This approach gives us a hell of a lot of speed in exchange for some memory
 * usage. All of the complex logic to turn schematic or board objects into
 * graphics primitives is done just once before anything is actually rendered.
 * After that, KiCanvas can easily re-draw everything with different
 * transformations, visibilities, and orders without having to re-calculate
 * everything.
 *
 */
export abstract class Renderer {
    #object_points: Vec2[] = null;

    canvas: HTMLCanvasElement;
    state: StateStack = new StateStack();
    text_shaper: TextShaper;
    theme: Record<string, Color>;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async setup() {
        if (!this.text_shaper) {
            this.text_shaper = await TextShaper.default();
        }
    }

    get background_color(): Color {
        return this.theme?.background ?? new Color(0, 0, 0, 1);
    }

    /**
     * Mark the start of a new object.
     *
     * This is used to track bounding boxes of drawn objects.
     */
    start_object(): void {
        this.#object_points = [];
    }

    /**
     * Add points to the current object.
     */
    add_object_points(pts: Iterable<Vec2>) {
        this.#object_points?.push(...pts);
    }

    /**
     * Mark the end of an object.
     * @returns the drawn object's bounding box
     */
    end_object(): BBox {
        if (this.#object_points == null) {
            throw new Error("No current object");
        }

        const bbox = BBox.from_points(this.#object_points);
        this.#object_points = null;
        return bbox;
    }

    abstract set_viewport(x: number, y: number, w: number, h: number): void;
    abstract clear_canvas(): void;
    abstract start_layer(): void;
    abstract end_layer(): any;

    abstract circle(point: Vec2, radius: number, color: Color);
    abstract arc(
        point: Vec2,
        radius: number,
        start_angle: number,
        end_angle: number,
        width: number,
        color: Color
    );
    abstract line(points: Vec2[], width: number, color: Color);
    abstract polygon(points: Vec2[], color: Color);
}

// export interface Layer {
//     // draw(transform: Matrix3): void;
// }

export class State {
    constructor(
        public matrix: Matrix3 = Matrix3.identity(),
        public fill: Color = null,
        public stroke: Color = null,
        public stroke_width: number = 0
    ) {}

    copy() {
        return new State(
            this.matrix.copy(),
            this.fill?.copy(),
            this.stroke?.copy(),
            this.stroke_width
        );
    }
}

export class StateStack {
    #stack: State[];

    constructor() {
        this.#stack = [new State()];
    }

    get top() {
        return this.#stack.at(-1);
    }

    /**
     * @returns the current transformation matrix
     */
    get matrix(): Matrix3 {
        return this.top.matrix;
    }

    /**
     * Set the transformation matrix stack.
     */
    set matrix(mat: Matrix3) {
        this.top.matrix = mat;
    }

    get stroke(): Color {
        return this.top.stroke;
    }

    set stroke(c: Color) {
        this.top.stroke = c;
    }

    get fill(): Color {
        return this.top.fill;
    }

    set fill(c: Color) {
        this.top.fill = c;
    }

    get stroke_width(): number {
        return this.top.stroke_width;
    }

    set stroke_width(n: number) {
        this.top.stroke_width = n;
    }

    /**
     * Multiply the current matrix with the given one
     */
    multiply(mat: Matrix3) {
        this.top.matrix.multiply_self(mat);
    }

    /**
     * Save the current state to the stack.
     */
    push() {
        this.#stack.push(this.top.copy());
    }

    /**
     * Pop the current transformation matrix off the stack and restore the
     * previous one.
     */
    pop() {
        this.#stack.pop();
    }
}
