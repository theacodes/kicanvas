/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "../math/vec2.js";

export class PanAndZoom {
    #target;
    #camera;
    #callback;
    #min_zoom;
    #max_zoom;
    #panning = false;
    #pan_inv_matrix;
    #pan_center = new Vec2(0, 0);
    #pan_mouse = new Vec2(0, 0);

    constructor(
        target,
        camera,
        callback = () => {},
        options = { minZoom: 0.5, maxZoom: 10 }
    ) {
        this.#target = target;
        this.#camera = camera;
        this.#callback = callback;
        this.#min_zoom = options.minZoom;
        this.#max_zoom = options.maxZoom;

        this.#target.addEventListener("mousedown", (e) => {
            e.preventDefault();
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
            this.#handle_zoom(e.deltaY, this.#relative_mouse_pos(e));
        });
    }

    #relative_mouse_pos(e) {
        const rect = this.#target.getBoundingClientRect();
        return new Vec2(e.clientX - rect.left, e.clientY - rect.top);
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
        this.#camera.move(center_delta);
        this.#callback();
    }
}
