/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Camera2 } from "./camera2.js";

/**
 * Scene combines a canvas, a renderer, and a camera to represent an abstract "scene"
 *
 * This is pretty barebones and its really just to help coordinate between the
 * camera, renderer, and canvas.
 */
export class Scene {
    renderer;
    width = null;
    height = null;
    camera;

    /**
     * Create a Scene
     * @param {*} renderer
     */
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

    /**
     * Resize the scene's viewport
     * @param {number} logical_w
     * @param {number} logical_h
     * @param {number} display_w
     * @param {number} display_h
     */
    resize(logical_w, logical_h, display_w, display_h) {
        this.renderer.set_viewport(0, 0, display_w, display_h);

        if (this.width != logical_w || this.height != logical_h) {
            this.width = logical_w;
            this.height = logical_h;
            this.projection = Matrix3.orthographic(this.width, this.height);
            this.camera.viewport_size = new Vec2(this.width, this.height);
        }
    }

    /**
     * @type {Matrix3}
     */
    get view_matrix() {
        return this.camera.matrix.inverse();
    }

    /**
     * @type {Matrix3}
     */
    get view_projection_matrix() {
        return this.projection.multiply(this.view_matrix.inverse());
    }

    /**
     * Get clip space coordinates from screen coordinates
     * @param {Vec2} v
     * @returns {Vec2}
     */
    screen_to_clip(v) {
        let x = 2 * (v.x / this.width) - 1;
        let y = -(2 * (v.y / this.height) - 1);

        return new Vec2(x, y);
    }

    /**
     * Get world space coordinates from clip coordinates
     * @param {Vec2} v
     * @returns {Vec2}
     */
    clip_to_world(v) {
        return this.view_projection_matrix.inverse().transform(v);
    }

    /**
     * Get screen space coordinates from world coordinates
     * @param {Vec2} v
     * @returns {Vec2}
     */
    screen_to_world(v) {
        return this.clip_to_world(this.screen_to_clip(v));
    }
}
