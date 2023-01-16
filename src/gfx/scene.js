/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Camera2 } from "./camera2.js";

export class Scene {
    renderer;
    width = null;
    height = null;
    camera;

    constructor(renderer) {
        this.renderer = renderer;

        this.camera = new Camera2(new Vec2(0, 0), new Vec2(0, 0), 1, 0);

        this.resize(
            this.renderer.canvas.clientWidth,
            this.renderer.canvas.clientWeight,
            this.renderer.canvas.width,
            this.renderer.canvas.height
        );
    }

    resize(logical_w, logical_h, display_w, display_h) {
        this.renderer.set_viewport(0, 0, display_w, display_h);

        if (this.width != logical_w || this.height != logical_h) {
            this.width = logical_w;
            this.height = logical_h;
            this.projection = Matrix3.orthographic(this.width, this.height);
            this.camera.viewport_size = new Vec2(this.width, this.height);
        }
    }

    get view_matrix() {
        return this.camera.matrix.inverse();
    }

    get view_projection_matrix() {
        return this.projection.copy().multiply(this.view_matrix.inverse());
    }

    screen_to_clip(v) {
        let x = 2 * (v.x / this.width) - 1;
        let y = -(2 * (v.y / this.height) - 1);

        return new Vec2(x, y);
    }

    clip_to_world(v) {
        return this.view_projection_matrix.inverse().transform(v);
    }

    screen_to_world(v) {
        return this.clip_to_world(this.screen_to_clip(v));
    }

    world_to_camera(v) {
        return this.view_matrix.transform(v);
    }

    camera_to_world(v) {
        return this.view_matrix.inverse().transform(v);
    }

    lookat(bbox) {
        const zoom_w = this.width / bbox.w;
        const zoom_h = this.height / bbox.h;
        const center_x = bbox.x + bbox.w / 2;
        const center_y = bbox.y + bbox.h / 2;
        this.camera.zoom = Math.min(zoom_w, zoom_h);
        this.camera.center.set(center_x, center_y);
    }
}
