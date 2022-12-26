/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Camera2 } from "./camera2.js";

export class Scene {
    gl;
    width = null;
    height = null;
    camera;

    constructor(gl) {
        this.gl = gl;
        this.camera = new Camera2(new Vec2(0, 0), new Vec2(0, 0), 1, 0);
        this.resize();

        new ResizeObserver(() => {
            this.resize();
        }).observe(this.gl.canvas);
    }

    get canvas() {
        return this.gl.canvas;
    }

    resize() {
        const canvas = this.canvas;
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        this.gl.viewport(0, 0, canvas.width, canvas.height);

        if (
            this.width != canvas.clientWidth ||
            this.height != canvas.clientHeight
        ) {
            this.width = canvas.clientWidth;
            this.height = canvas.clientHeight;
            this.projection = Matrix3.orthographic(this.width, this.height);
            this.camera.viewport_size = new Vec2(this.width, this.height);
        }
    }

    get canvas() {
        return this.gl.canvas;
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
