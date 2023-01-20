/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

// TODO: remove this class

export class CanvasHelper {
    #cvs;
    #ctx;

    constructor(canvas, context) {
        this.#cvs = canvas;
        this.#ctx = context;

        new ResizeObserver((_) => {
            this.#resize();
        }).observe(this.#cvs);
    }

    #resize() {
        console.log("TODO: Handle resize");
    }

    scale_for_device_pixel_ratio() {
        const dpr = window.devicePixelRatio;
        const rect = this.#cvs.getBoundingClientRect();
        this.#cvs.width = Math.round(rect.width * dpr);
        this.#cvs.height = Math.round(rect.height * dpr);
        this.#ctx.setTransform();
        this.#ctx.scale(dpr, dpr);
    }

    screen_space_to_world_space(x, y) {
        const dpr = window.devicePixelRatio;
        const rect = this.#cvs.getBoundingClientRect();
        const ss_pt = new DOMPoint(x - rect.left, y - rect.top);
        const mat = this.#ctx.getTransform().inverse().scale(dpr, dpr);
        return mat.transformPoint(ss_pt);
    }
}
