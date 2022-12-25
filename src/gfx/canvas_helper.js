/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

class CanvasHelper {
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
}
