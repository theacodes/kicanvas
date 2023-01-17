/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";

/**
 * Interactive Pan and Zoom helper
 */
export class PanAndZoom {
    #target;
    #camera;
    #callback;
    #min_zoom;
    #max_zoom;
    #panning = false;
    #rect;
    #pan_inv_matrix;
    #pan_center = new Vec2(0, 0);
    #pan_mouse = new Vec2(0, 0);

    /**
     * Create an interactive pan and zoom helper
     * @param {HTMLElement} target - the element to attach to and listen for mouse events
     * @param {Camera2} camera - the camera that will be updated when panning and zooming
     * @param {*} callback - optional callback when pan and zoom happens
     * @param {number} min_zoom
     * @param {number} max_zoom
     */
    constructor(
        target,
        camera,
        callback = () => {},
        min_zoom = 0.5,
        max_zoom = 10
    ) {
        this.#target = target;
        this.#camera = camera;
        this.#callback = callback;
        this.#min_zoom = min_zoom;
        this.#max_zoom = max_zoom;

        this.#target.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.#rect = this.#target.getBoundingClientRect();
            this.#start_pan(this.#relative_mouse_pos(e));
        });

        window.addEventListener("mouseup", (e) => {
            this.#panning = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (!this.#panning) return;
            this.#continue_pan(this.#relative_mouse_pos(e));
        });

        this.#target.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.#rect = this.#target.getBoundingClientRect();
            this.#handle_zoom(e.deltaY, this.#relative_mouse_pos(e));
        });
    }

    #relative_mouse_pos(e) {
        return new Vec2(
            e.clientX - this.#rect.left,
            e.clientY - this.#rect.top
        );
    }

    #start_pan(mouse) {
        const mouse_world = this.#camera.screen_to_world(mouse);
        this.#pan_mouse.set(mouse_world);
        this.#pan_center.set(this.#camera.center);
        this.#pan_inv_matrix = this.#camera.matrix.inverse();
        this.#panning = true;
    }

    #continue_pan(mouse) {
        const mouse_world = this.#pan_inv_matrix.transform(mouse);
        const delta = mouse_world.sub(this.#pan_mouse);
        this.#camera.center.set(this.#pan_center.sub(delta));
        this.#callback();
    }

    #handle_zoom(delta, mouse) {
        const mouse_world = this.#camera.screen_to_world(mouse);
        this.#camera.zoom *= Math.exp(delta * -0.001);
        this.#camera.zoom = Math.min(
            this.#max_zoom,
            Math.max(this.#camera.zoom, this.#min_zoom)
        );
        const new_world = this.#camera.screen_to_world(mouse);
        const center_delta = mouse_world.sub(new_world);
        this.#camera.translate(center_delta);
        this.#callback();
    }
}
