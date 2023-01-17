/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Angle } from "../math/angle.js";
import { BBox } from "../math/bbox.js";

/**
 * A camera in 2d space.
 *
 * This manages the minimal state required to pan, zoom, and rotate. It's
 * abstract and isn't integrated into any specific graphics backend. Use
 * .matrix to get the complete transformation matrix to pass to whichever
 * graphics backend you're using.
 */
export class Camera2 {
    viewport_size;
    center;
    zoom;
    rotation;

    /**
     * Create a camera
     * @param {Vec2} viewport_size - The width and height of the viewport
     * @param {Vec2} center - The point at which the camera's view is centered
     * @param {number} zoom - Scale factor, increasing numbers zoom the camera in.
     * @param {number|Angle} rotation - Rotation (roll) in radians.
     */
    constructor(
        viewport_size = new Vec2(0, 0),
        center = new Vec2(0, 0),
        zoom = 1,
        rotation = 0
    ) {
        this.center = center;
        this.viewport_size = viewport_size;
        this.rotation = new Angle(rotation);
        this.zoom = zoom;
    }

    /**
     * Relative translation
     * @param {Vec2} v
     */
    translate(v) {
        this.center.x += v.x;
        this.center.y += v.y;
    }

    /**
     * Relative rotation
     * @param {Angle|number} a - rotation in radians
     */
    rotate(a) {
        this.rotation.add(a);
    }

    /**
     * Complete transformation matrix.
     * @returns {Matrix3}
     */
    get matrix() {
        const mx = this.viewport_size.x / 2;
        const my = this.viewport_size.y / 2;
        const dx = this.center.x - this.center.x * this.zoom;
        const dy = this.center.y - this.center.y * this.zoom;
        const left = -(this.center.x - mx) + dx;
        const top = -(this.center.y - my) + dy;
        return Matrix3.translation(left, top)
            .rotate(this.rotation)
            .scale(this.zoom, this.zoom);
    }

    /**
     * Bounding box representing the camera's view
     * @returns {BBox}
     * */
    get bbox() {
        const m = this.matrix.inverse();
        const start = m.transform(new Vec2(0, 0));
        const end = m.transform(
            new Vec2(this.viewport_size.x, this.viewport_size.y)
        );
        return new BBox(start.x, start.y, end.x - start.x, end.y - start.y);
    }

    /**
     * Move the camera and adjust zoom so that the given bounding box is in
     * view.
     * @param {BBox} bbox
     */
    set bbox(bbox) {
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
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    apply_to_canvas(ctx) {
        this.viewportSize.set(ctx.canvas.clientWidth, ctx.canvas.clientHeight);
        let m = Matrix3.from_DOMMatrix(ctx.getTransform());
        m = m.multiply(this.matrix);
        ctx.setTransform(m.to_DOMMatrix());
    }

    /**
     * Transform screen coordinates to world coordinates
     *
     * @param {Vec2} v
     * @returns {Vec2}
     */
    screen_to_world(v) {
        return this.matrix.inverse().transform(v);
    }

    /**
     * Transform world coordinates to screen coordinates
     * @param {Vec2} v
     * @returns {Vec2}
     */
    world_to_screen(v) {
        return this.matrix.transform(v);
    }
}
