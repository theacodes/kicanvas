import { PrimitiveSet } from "./primitives.js";
import { Matrix3 } from "../math/matrix3.js";
import { f4_to_rgba } from "./colorspace.js";
import { BBox } from "../math/bbox.js";
import { Vec2 } from "../math/vec2.js";

/**
 * WebGL2-based renderer
 */
export class WebGL2Renderer {
    /** Transformation stack
     * @type {Array.<Matrix3>}
     */
    #transform_stack = [Matrix3.identity()];

    /** Graphics layers
     * @type {Array.<PrimitiveSet>}
     */
    #layers = [];

    /** The layer currently being drawn to.
     * @type {PrimitiveSet?}
     */
    #active_layer;

    /** The color of the viewport & canvas background.
     * @type {[number, number, number, number]}
     */
    #background_color;

    /** A list of points belonging to the object that's currently being drawn,
     * used to calculate object BBox.
     * @type {Array.<Vec2>?}
     */
    #current_object_points;

    /**
     * Context available to anything that uses this renderer.
     */
    context = {};

    /**
     * Create a new WebGL2Renderer
     * @param {HTMLCanvasElement} canvas
     * @param {[number, number, number, number]} background_color
     */
    constructor(canvas, background_color) {
        this.canvas = canvas;
        this.#background_color = background_color;
    }

    /**
     * Create and configure the WebGL2 context.
     */
    async setup() {
        // just in case the browser still gives us a backbuffer with alpha,
        // set the background color of the canvas to black so that it behaves
        // correctly.
        this.canvas.style.backgroundColor = f4_to_rgba(this.#background_color);

        let gl = this.canvas.getContext("webgl2", { alpha: false });

        if (gl == null) {
            throw new Error("Unable to create WebGL2 context");
        }

        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);

        gl.clearColor(...this.#background_color);
        gl.clearDepth(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.set_viewport(0, 0, this.canvas.width, this.canvas.height);

        await PrimitiveSet.load_shaders(gl);
    }

    /**
     * Update the WebGL2 context's viewport. Should be called whenever the size
     * of the underlying canvas element changes.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    set_viewport(x, y, w, h) {
        if (this.gl == null) throw new Error("Uninitialized");
        this.gl.viewport(x, y, w, h);
    }

    /**
     * Clear the canvas. Typically called at the start of a frame.
     */
    clear_canvas() {
        if (this.gl == null) throw new Error("Uninitialized");
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    /**
     * @returns {Matrix3} the current transformation matrix
     */
    get_transform() {
        return this.#transform_stack.at(-1) ?? Matrix3.identity();
    }

    /**
     * Set (or reset) the transformation matrix stack.
     * @param {Matrix3?} mat
     */
    set_transform(mat = null) {
        this.#transform_stack = mat ? [mat] : [Matrix3.identity()];
    }

    /**
     * Save the current transformation matrix and push a new one onto the top
     * of the stack. The new matrix is multiplied by the old.
     * @param {Matrix3} mat
     */
    push_transform(mat) {
        this.#transform_stack.push(this.get_transform().multiply(mat));
    }

    /**
     * Pop the current transformation matrix off the stack and restore the
     * previous one.
     */
    pop_transform() {
        this.#transform_stack.pop();
    }

    /**
     * Start a new layer of graphics.
     *
     * Each layer represents a set of primitives
     * that are all drawn at the same time and at the same depth. end_layer()
     * must be called for the graphics to actually show up.
     */
    start_layer() {
        if (this.gl == null) throw new Error("Uninitialized");
        this.#active_layer = new PrimitiveSet(this.gl);
    }

    /**
     * Finish a layer of graphics.
     *
     * Performs any additional work needed such as tesselation and buffer
     * management.
     *
     * @returns {PrimitiveSet} the finished layer
     */
    end_layer() {
        if (this.#active_layer == null) throw new Error("No active layer");

        this.#active_layer.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;

        // @ts-ignore
        return this.#layers.at(-1);
    }

    /**
     * Mark the start of a new object.
     *
     * This is used to track bounding boxes of drawn objects.
     */
    start_object() {
        this.#current_object_points = [];
    }

    /**
     * Mark the end of an object.
     * @returns {BBox} the drawn object's bounding box
     */
    end_object() {
        if (this.#current_object_points == null)
            throw new Error("No current object");

        const bbox = BBox.from_points(this.#current_object_points);
        this.#current_object_points = null;
        return bbox;
    }

    /**
     * Draw a circle
     * @param {Vec2} point
     * @param {number} radius
     * @param {Array.<number>} color an array of [r, g, b, a] normalized color values.
     */
    circle(point, radius, color) {
        if (this.#active_layer == null) throw new Error("No active layer");

        point = this.get_transform().transform(point);

        this.#active_layer.add_circle(point, radius, color);

        this.#current_object_points?.push(
            point.add(new Vec2(radius, radius)),
            point.sub(new Vec2(radius, radius))
        );
    }

    /**
     * Draw a polyline
     * @param {Array.<Vec2>} points
     * @param {number} width
     * @param {Array.<number>} color an array of [r, g, b, a] normalized color values.
     */
    line(points, width, color) {
        if (this.#active_layer == null) throw new Error("No active layer");

        points = Array.from(this.get_transform().transform_all(points));

        this.#active_layer.add_line(points, width, color);

        // TODO: take width into account?
        this.#current_object_points?.push(...points);
    }

    /**
     * Draw a polygon
     * @param {Array.<Vec2>} points
     * @param {Array.<number>} color an array of [r, g, b, a] normalized color values.
     */
    polygon(points, color) {
        if (this.#active_layer == null) throw new Error("No active layer");

        points = Array.from(this.get_transform().transform_all(points));

        this.#active_layer.add_polygon(points, color);

        if (this.#current_object_points != null) {
            this.#current_object_points =
                this.#current_object_points.concat(points);
        }
    }

    /**
     * Iterate through all layers
     * @yields {PrimitiveSet}
     */
    *layers() {
        for (const layer of this.#layers) {
            yield layer;
        }
    }
}
