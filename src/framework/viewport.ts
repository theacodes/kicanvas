/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { SizeObserver } from "../base/dom/size-observer";
import { PanAndZoom } from "../base/dom/pan-and-zoom";
import { Renderer } from "../gfx/renderer";
import { Angle } from "../math/angle";
import { BBox } from "../math/bbox";
import { Camera2 } from "../math/camera2";
import { Matrix3 } from "../math/matrix3";
import { Vec2 } from "../math/vec2";

/**
 * Viewport combines a canvas, a renderer, and a camera to represent a view
 * into a scene.
 */
export class Viewport {
    #observer: SizeObserver;
    #pan_and_zoom: PanAndZoom;
    #resolve_ready: () => void;

    width: number;
    height: number;
    camera: Camera2;
    ready: Promise<void>;

    /**
     * Create a Scene
     * @param callback - a callback used to re-draw the viewport when it changes.
     */
    constructor(public renderer: Renderer, public callback: () => void) {
        this.ready = new Promise((resolve) => {
            this.#resolve_ready = resolve;
        });

        this.camera = new Camera2(
            new Vec2(0, 0),
            new Vec2(0, 0),
            1,
            new Angle(0),
        );

        this.#observer = new SizeObserver(this.renderer.canvas, () => {
            this.#update_camera();
            this.callback();
        });

        this.#update_camera();
    }

    dispose() {
        this.#observer.dispose();
    }

    /**
     * Update the camera with the new canvas size.
     */
    #update_camera() {
        const canvas = this.renderer.canvas;

        if (
            canvas.clientWidth > 0 &&
            canvas.clientHeight > 0 &&
            (this.width != canvas.clientWidth ||
                this.height != canvas.clientHeight)
        ) {
            this.width = canvas.clientWidth;
            this.height = canvas.clientHeight;
            this.camera.viewport_size = new Vec2(this.width, this.height);

            if (this.width && this.height) {
                this.#resolve_ready();
            }
        }
    }

    enable_pan_and_zoom(min_zoom?: number, max_zoom?: number) {
        this.#pan_and_zoom = new PanAndZoom(
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

    /**
     * Limit the camera's center within the given bounds.
     */
    set bounds(bb: BBox) {
        this.#pan_and_zoom.bounds = bb;
    }
}
