/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";

export class Scene {
    constructor(gl) {
        this.gl = gl;
        this.camera_zoom = 1;
        this.camera_position = new Vec2(0, 0);
        this.resize();

        new ResizeObserver((entries) => {
            this.resize();
        }).observe(this.gl.canvas);
    }

    resize() {
        const canvas = this.gl.canvas;
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        this.gl.viewport(0, 0, canvas.width, canvas.height);

        if (
            this.width != canvas.clientWidth ||
            this.height != canvas.clientHeight
        ) {
            this.width = canvas.clientWidth;
            this.height = canvas.clientHeight;
            this.center = new Vec2(this.width / 2, this.height / 2);
            this.projection = Matrix3.orthographic(this.width, this.height);
        }
    }

    get canvas() {
        return this.gl.canvas;
    }

    get view_matrix() {
        return Matrix3.translation(
            this.camera_position.x,
            this.camera_position.y
        ).scale(1 / this.camera_zoom, 1 / this.camera_zoom);
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

        this.camera_position.set(0, 0);

        this.camera_zoom = Math.min(zoom_w, zoom_h);
        const center = this.world_to_camera(this.center);

        this.camera_position.x = bbox.x + bbox.w / 2 - center.x;
        this.camera_position.y = bbox.y + bbox.h / 2 - center.y;
    }
}

export class PanAndZoom {
    constructor(scene) {
        this.scene = scene;
        this.is_panning = false;
        this.mouse = new Vec2(0, 0);
        this.pan_mouse_start = new Vec2(0, 0);
        this.pan_mouse_start_mat = null;
        this.pan_camera_start = new Vec2(0, 0);

        this.scene.canvas.addEventListener("mousedown", (e) => {
            this.start_pan();
        });

        this.scene.canvas.addEventListener("mouseup", (e) => {
            this.stop_pan();
        });

        this.scene.canvas.addEventListener("mousemove", (e) => {
            this.mouse.set(e.offsetX, e.offsetY);
            this.pan();
        });

        this.scene.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.zoom(e.deltaY);
        });
    }

    start_pan() {
        this.pan_camera_start.set(this.scene.camera_position);
        this.pan_mouse_start_mat = this.scene.view_projection_matrix.inverse();
        this.pan_mouse_start.set(this.scene.screen_to_world(this.mouse));
        this.is_panning = true;
    }

    stop_pan() {
        this.is_panning = false;
    }

    pan() {
        if (!this.is_panning) {
            return;
        }

        const pos = this.pan_mouse_start_mat.transform(
            this.scene.screen_to_clip(this.mouse)
        );

        this.scene.camera_position.set(
            this.pan_camera_start.add(this.pan_mouse_start.sub(pos))
        );
    }

    zoom(delta) {
        const pre_pos = this.scene.screen_to_world(this.mouse);
        this.scene.camera_zoom *= Math.exp(delta * -0.001);
        this.scene.camera_zoom = Math.min(
            160,
            Math.max(this.scene.camera_zoom, 1.0)
        );
        const post_pos = this.scene.screen_to_world(this.mouse);
        this.scene.camera_position.set(
            this.scene.camera_position.add(pre_pos.sub(post_pos))
        );
    }
}
