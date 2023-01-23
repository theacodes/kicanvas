/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Camera2 } from "./camera2.js";
import { PanAndZoom } from "./pan_and_zoom.js";
import { CanvasSizeObserver } from "./canvas_size_observer.js";
import { Renderer } from "./renderer.js";
import { Angle } from "../math/angle.js";

/**
 * Viewport combines a canvas, a renderer, and a camera to represent a view
 * into a scene.
 */
export class Viewport {
    width: number;
    height: number;
    camera: Camera2;
    projection: Matrix3;

    /**
     * Create a Scene
     * @param callback - a callback used to re-draw the viewport when it changes.
     */
    constructor(public renderer: Renderer, public callback: (() => void)) {
        this.camera = new Camera2(
            new Vec2(0, 0),
            new Vec2(0, 0),
            1,
            new Angle(0));

        new CanvasSizeObserver(
            this.renderer.canvas,
            (cw, ch, lw, lh) => {
                this.resize(cw, ch, lw, lh);
                this.callback();
            }
        );

        this.resize(
            this.renderer.canvas.clientWidth,
            this.renderer.canvas.clientHeight,
            this.renderer.canvas.width,
            this.renderer.canvas.height
        );
    }

    /**
     * Resize the viewport
     */
    resize(logical_w: number, logical_h: number, display_w: number, display_h: number) {
        this.renderer.set_viewport(0, 0, display_w, display_h);

        if (this.width != logical_w || this.height != logical_h) {
            this.width = logical_w;
            this.height = logical_h;
            this.projection = Matrix3.orthographic(this.width, this.height);
            this.camera.viewport_size = new Vec2(this.width, this.height);
        }
    }

    enable_pan_and_zoom(min_zoom = 0.1, max_zoom = 100) {
        new PanAndZoom(
            this.renderer.canvas,
            this.camera,
            () => {
                this.callback();
            },
            min_zoom,
            max_zoom
        );
    }

    get view_matrix(): Matrix3 {
        return this.camera.matrix.inverse();
    }

    get view_projection_matrix(): Matrix3 {
        return this.projection.multiply(this.view_matrix.inverse());
    }

    /**
     * Get clip space coordinates from screen coordinates
     */
    screen_to_clip(v: Vec2): Vec2 {
        const x = 2 * (v.x / this.width) - 1;
        const y = -(2 * (v.y / this.height) - 1);

        return new Vec2(x, y);
    }

    /**
     * Get world space coordinates from clip coordinates
     */
    clip_to_world(v: Vec2): Vec2 {
        return this.view_projection_matrix.inverse().transform(v);
    }

    /**
     * Get screen space coordinates from world coordinates
     */
    screen_to_world(v: Vec2): Vec2 {
        return this.clip_to_world(this.screen_to_clip(v));
    }
}
