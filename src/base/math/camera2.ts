/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "./vec2";
import { Matrix3 } from "./matrix3";
import { Angle, type AngleLike } from "./angle";
import { BBox } from "./bbox";

/**
 * A camera in 2d space.
 *
 * This manages the minimal state required to pan, zoom, and rotate. It's
 * abstract and isn't integrated into any specific graphics backend. Use
 * .matrix to get the complete transformation matrix to pass to whichever
 * graphics backend you're using.
 */
export class Camera2 {
    /**
     * Create a camera
     * @param {Vec2} viewport_size - The width and height of the viewport
     * @param {Vec2} center - The point at which the camera's view is centered
     * @param {number} zoom - Scale factor, increasing numbers zoom the camera in.
     * @param {number|Angle} rotation - Rotation (roll) in radians.
     */
    constructor(
        public viewport_size: Vec2 = new Vec2(0, 0),
        public center: Vec2 = new Vec2(0, 0),
        public zoom: number = 1,
        public rotation: Angle = new Angle(0),
    ) {}

    /**
     * Relative translation
     * @param v
     */
    translate(v: Vec2) {
        this.center.x += v.x;
        this.center.y += v.y;
    }

    /**
     * Relative rotation
     * @param {Angle|number} a - rotation in radians
     */
    rotate(a: AngleLike) {
        this.rotation = this.rotation.add(a);
    }

    /**
     * Complete transformation matrix.
     */
    get matrix(): Matrix3 {
        const mx = this.viewport_size.x / 2;
        const my = this.viewport_size.y / 2;
        const dx = this.center.x - this.center.x * this.zoom;
        const dy = this.center.y - this.center.y * this.zoom;
        const left = -(this.center.x - mx) + dx;
        const top = -(this.center.y - my) + dy;
        return Matrix3.translation(left, top)
            .rotate_self(this.rotation)
            .scale_self(this.zoom, this.zoom);
    }

    /**
     * Bounding box representing the camera's view
     * */
    get bbox(): BBox {
        const m = this.matrix.inverse();
        const start = m.transform(new Vec2(0, 0));
        const end = m.transform(
            new Vec2(this.viewport_size.x, this.viewport_size.y),
        );
        return new BBox(start.x, start.y, end.x - start.x, end.y - start.y);
    }

    /**
     * Move the camera and adjust zoom so that the given bounding box is in
     * view.
     */
    set bbox(bbox: BBox) {
        const zoom_w = this.viewport_size.x / bbox.w;
        const zoom_h = this.viewport_size.y / bbox.h;
        const center_x = bbox.x + bbox.w / 2;
        const center_y = bbox.y + bbox.h / 2;
        this.zoom = Math.min(zoom_w, zoom_h);
        this.center.set(center_x, center_y);
    }

    get top() {
        return this.bbox.y;
    }

    get bottom() {
        return this.bbox.y2;
    }

    get left() {
        return this.bbox.x;
    }

    get right() {
        return this.bbox.x2;
    }

    /**
     * Apply this camera to a 2d canvas
     *
     * A simple convenience method that sets the canvas's transform to
     * the camera's transformation matrix.
     */
    apply_to_canvas(ctx: CanvasRenderingContext2D) {
        this.viewport_size.set(ctx.canvas.clientWidth, ctx.canvas.clientHeight);
        const m = Matrix3.from_DOMMatrix(ctx.getTransform());
        m.multiply_self(this.matrix);
        ctx.setTransform(m.to_DOMMatrix());
    }

    /**
     * Transform screen coordinates to world coordinates
     */
    screen_to_world(v: Vec2): Vec2 {
        return this.matrix.inverse().transform(v);
    }

    /**
     * Transform world coordinates to screen coordinates
     */
    world_to_screen(v: Vec2): Vec2 {
        return this.matrix.transform(v);
    }
}
