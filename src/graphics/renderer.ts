/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../base/color";
import type { IDisposable } from "../base/disposable";
import { Angle, BBox, Arc as MathArc, Matrix3, Vec2 } from "../base/math";
import { Arc, Circle, Polygon, Polyline } from "./shapes";

/**
 * KiCanvas' abstraction over various graphics backends.
 *
 * In general, KiCanvas uses a retained-mode rendering system. That is,
 * drawing commands are issued to the renderer by a "painter" and the renderer
 * does not immediately draw the specified graphics. Instead, the renderer will
 * compile all of the drawing commands together into a "layer". These layers
 * will be actually rendered later.
 *
 * This approach gives us a hell of a lot of speed in exchange for some memory
 * usage. All of the complex logic to turn schematic or board objects into
 * graphics primitives is done just once before anything is actually rendered.
 * After that, KiCanvas can easily re-draw everything with different
 * transformations, visibilities, and orders without having to re-calculate
 * everything.
 *
 */
export abstract class Renderer implements IDisposable {
    #current_bbox: BBox | null;

    canvas: HTMLCanvasElement;
    canvas_size: Vec2 = new Vec2(0, 0);
    state: RenderStateStack = new RenderStateStack();
    #background_color: Color = Color.black.copy();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.background_color = this.#background_color;
    }

    get background_color(): Color {
        return this.#background_color;
    }

    set background_color(color: Color) {
        this.#background_color = color;
        this.canvas.style.backgroundColor = this.background_color.to_css();
    }

    abstract setup(): Promise<void>;

    abstract dispose(): void;

    /**
     * Update the canvas and context with the new viewport size if needed. This
     * is typically called by clear_canvas().
     */
    abstract update_canvas_size(): void;

    /**
     * Clear the canvas. Typically called at the start of a frame.
     */
    abstract clear_canvas(): void;

    /**
     * Start a new bbox for automatically tracking bounding boxes of drawn objects.
     */
    start_bbox(): void {
        this.#current_bbox = new BBox(0, 0, 0, 0);
    }

    /**
     * Adds a bbox to the current bbox.
     */
    add_bbox(bb: BBox) {
        if (!this.#current_bbox) {
            return;
        }

        this.#current_bbox = BBox.combine([this.#current_bbox, bb], bb.context);
    }

    /**
     * Stop adding drawing to the current bbox and return it.
     */
    end_bbox(context: any): BBox {
        const bb = this.#current_bbox;
        if (bb == null) {
            throw new Error("No current bbox");
        }

        bb.context = context;

        this.#current_bbox = null;
        return bb;
    }

    /**
     * Start a new layer of graphics.
     *
     * Each layer represents a set of primitives
     * that are all drawn at the same time and at the same depth. end_layer()
     * must be called for the graphics to actually show up.
     */
    abstract start_layer(name: string): void;

    /**
     * Finish a layer of graphics.
     *
     * Performs any additional work needed such as tesselation and buffer
     * management.
     */
    abstract end_layer(): RenderLayer;

    /**
     * Iterate through layers.
     */
    abstract get layers(): Iterable<RenderLayer>;

    /**
     * Remove a layer, called automatically by layer.dispose
     */
    abstract remove_layer(layer: RenderLayer): void;

    /**
     * Draw a filled circle
     */
    abstract circle(circle: Circle): void;
    abstract circle(center: Vec2, radius: number, color?: Color): void;
    abstract circle(
        circle_or_center: Circle | Vec2,
        radius?: number,
        color?: Color,
    ): void;

    protected prep_circle(
        circle_or_center: Circle | Vec2,
        radius?: number,
        color?: Color,
    ): Circle {
        let circle: Circle;
        if (circle_or_center instanceof Circle) {
            circle = circle_or_center;
        } else {
            circle = new Circle(
                circle_or_center,
                radius!,
                color ?? this.state.fill,
            );
        }

        if (!circle.color || circle.color.is_transparent_black) {
            circle.color = this.state.fill ?? Color.transparent_black;
        }

        circle.center = this.state.matrix.transform(circle.center);

        const radial = new Vec2(circle.radius, circle.radius);
        this.add_bbox(
            BBox.from_points([
                circle.center.add(radial),
                circle.center.sub(radial),
            ]),
        );

        return circle;
    }

    /**
     * Draw a stroked arc
     */
    abstract arc(arc: Arc): void;
    abstract arc(
        center: Vec2,
        radius: number,
        start_angle: Angle,
        end_angle: Angle,
        width?: number,
        color?: Color,
    ): void;
    abstract arc(
        arc_or_center: Arc | Vec2,
        radius?: number,
        start_angle?: Angle,
        end_angle?: Angle,
        width?: number,
        color?: Color,
    ): void;

    protected prep_arc(
        arc_or_center: Arc | Vec2,
        radius?: number,
        start_angle?: Angle,
        end_angle?: Angle,
        width?: number,
        color?: Color,
    ): Arc {
        let arc: Arc;
        if (arc_or_center instanceof Arc) {
            arc = arc_or_center;
        } else {
            arc = new Arc(
                arc_or_center,
                radius!,
                start_angle ?? new Angle(0),
                end_angle ?? new Angle(Math.PI * 2),
                width ?? this.state.stroke_width,
                color ?? this.state.stroke,
            );
        }

        if (!arc.color || arc.color.is_transparent_black) {
            arc.color = this.state.stroke ?? Color.transparent_black;
        }

        // TODO: This should probably be its own method.
        const math_arc = new MathArc(
            arc.center,
            arc.radius,
            arc.start_angle,
            arc.end_angle,
            arc.width,
        );
        const points = math_arc.to_polyline();

        this.line(new Polyline(points, arc.width, arc.color));

        return arc;
    }

    /**
     * Draw a stroked polyline
     */
    abstract line(line: Polyline): void;
    abstract line(points: Vec2[], width?: number, color?: Color): void;
    abstract line(
        line_or_points: Polyline | Vec2[],
        width?: number,
        color?: Color,
    ): void;

    protected prep_line(
        line_or_points: Polyline | Vec2[],
        width?: number,
        color?: Color,
    ): Polyline {
        let line: Polyline;
        if (line_or_points instanceof Polyline) {
            line = line_or_points;
        } else {
            line = new Polyline(
                line_or_points,
                width ?? this.state.stroke_width,
                color ?? this.state.stroke,
            );
        }

        if (!line.color || line.color.is_transparent_black) {
            line.color = this.state.stroke ?? Color.transparent_black;
        }

        line.points = Array.from(this.state.matrix.transform_all(line.points));

        let bbox = BBox.from_points(line.points);
        bbox = bbox.grow(line.width);
        this.add_bbox(bbox);

        return line;
    }

    /**
     * Draw a filled polygon
     */
    abstract polygon(polygon: Polygon): void;
    abstract polygon(points: Vec2[], color?: Color): void;
    abstract polygon(polygon_or_points: Polygon | Vec2[], color?: Color): void;

    protected prep_polygon(
        polygon_or_points: Polygon | Vec2[],
        color?: Color,
    ): Polygon {
        let polygon: Polygon;
        if (polygon_or_points instanceof Polygon) {
            polygon = polygon_or_points;
        } else {
            polygon = new Polygon(polygon_or_points, color ?? this.state.fill);
        }

        if (!polygon.color || polygon.color.is_transparent_black) {
            polygon.color = this.state.fill ?? Color.transparent_black;
        }

        polygon.points = Array.from(
            this.state.matrix.transform_all(polygon.points),
        );

        this.add_bbox(BBox.from_points(polygon.points));

        return polygon;
    }

    /** Draw a list of glyphs */
    glyphs(glyphs: any[]) {
        // TODO
    }
}

export abstract class RenderLayer implements IDisposable {
    composite_operation: GlobalCompositeOperation = "source-over";

    constructor(
        public readonly renderer: Renderer,
        public readonly name: string,
    ) {}

    dispose() {
        this.renderer.remove_layer(this);
    }

    abstract clear(): void;

    abstract render(
        camera: Matrix3,
        depth: number,
        global_alpha?: number,
    ): void;
}

export class RenderState {
    constructor(
        public matrix: Matrix3 = Matrix3.identity(),
        public fill: Color = Color.black,
        public stroke: Color = Color.black,
        public stroke_width: number = 0,
    ) {}

    copy() {
        return new RenderState(
            this.matrix.copy(),
            this.fill?.copy(),
            this.stroke?.copy(),
            this.stroke_width,
        );
    }
}

export class RenderStateStack {
    #stack: RenderState[];

    constructor() {
        this.#stack = [new RenderState()];
    }

    get top() {
        return this.#stack.at(-1)!;
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
