/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2";
import { Matrix3 } from "../math/matrix3";
import { Camera2 } from "../math/camera2";
import { PanAndZoom } from "../dom/pan-and-zoom";
import { CanvasSizeObserver } from "../dom/canvas-size-observer";
import { Renderer } from "../gfx/renderer";
import { Angle } from "../math/angle";

/**
 * Viewport combines a canvas, a renderer, and a camera to represent a view
 * into a scene.
 */
export class Viewport {
    #observer: CanvasSizeObserver;
    width: number;
    height: number;
    camera: Camera2;

    /**
     * Create a Scene
     * @param callback - a callback used to re-draw the viewport when it changes.
     */
    constructor(public renderer: Renderer, public callback: () => void) {
        this.camera = new Camera2(
            new Vec2(0, 0),
            new Vec2(0, 0),
            1,
            new Angle(0),
        );

        this.#observer = new CanvasSizeObserver(
            this.renderer.canvas,
            (cw, ch, lw, lh) => {
                this.resize(cw, ch, lw, lh);
                this.callback();
            },
        );

        this.resize(
            this.renderer.canvas.clientWidth,
            this.renderer.canvas.clientHeight,
            this.renderer.canvas.width,
            this.renderer.canvas.height,
        );
    }

    dispose() {
        this.#observer.dispose();
    }

    /**
     * Resize the viewport
     */
    resize(
        logical_w: number,
        logical_h: number,
        display_w: number,
        display_h: number,
    ) {
        if (this.width != logical_w || this.height != logical_h) {
            this.renderer.update_viewport();
            this.width = logical_w;
            this.height = logical_h;
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
            max_zoom,
        );
    }

    /**
     * The matrix representing this viewport. This can be passed into rendering
     * methods to display things at the right spot.
     */
    get view_matrix(): Matrix3 {
        return this.camera.matrix;
    }
}
