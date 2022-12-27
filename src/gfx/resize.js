/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Like ResizeObserver, but specific to HTMLCanvasElement.
 *
 * Handles setting the initial canvas size based on the device pixel ratio,
 * and handling any subsequent resize events by adjusting the canvas size
 * appropriately
 */
export class CanvasSizeObserver {
    canvas = null;
    #callback = null;

    constructor(canvas, callback) {
        this.canvas = canvas;
        this.#callback = callback;

        new ResizeObserver(() => {
            this.resize();
        }).observe(canvas);
    }

    resize() {
        const c = this.canvas;
        c.width = c.clientWidth * window.devicePixelRatio;
        c.height = c.clientHeight * window.devicePixelRatio;
        this.#callback(c, c.clientWidth, c.clientHeight, c.width, c.height);
    }
}
