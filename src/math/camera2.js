/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "./vec2.js";
import { Matrix3 } from "./matrix3.js";

class Camera2 {
    viewport_size;
    center;
    zoom;
    rotation;

    constructor(
        viewport_size = new Vec2(0, 0),
        center = new Vec2(0, 0),
        zoom = 1,
        rotation = 0
    ) {
        this.center = center;
        this.viewport_size = viewport_size;
        this.rotation = rotation;
        this.zoom = zoom;
    }

    move(v) {
        this.center.x += v.x;
        this.center.y += v.y;
    }

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

    apply_to_canvas(ctx) {
        this.viewportSize.set(ctx.canvas.clientWidth, ctx.canvas.clientHeight);
        let m = Matrix3.from_DOMMatrix(ctx.getTransform());
        m = m.multiply(this.matrix);
        ctx.setTransform(m.to_DOMMatrix());
    }

    screen_to_world(v) {
        return this.matrix.inverse().transform(v);
    }

    world_to_screen(v) {
        return this.matrix.transform(v);
    }
}
