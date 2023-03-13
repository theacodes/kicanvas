/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { IDisposable } from "../base/disposable";

type ResizeObserverCallback = (canvas: HTMLCanvasElement) => void;

/**
 * Like ResizeObserver, but specific to HTMLCanvasElement.
 *
 * Handles setting the initial canvas size based on the device pixel ratio,
 * and handling any subsequent resize events by adjusting the canvas size
 * appropriately
 */
export class CanvasSizeObserver implements IDisposable {
    #observer: ResizeObserver;

    /**
     * Create a CanvasSizeObserver
     */
    constructor(
        public canvas: HTMLCanvasElement,
        private callback: ResizeObserverCallback,
    ) {
        this.#observer = new ResizeObserver(() => {
            this.callback(this.canvas);
        });
        this.#observer.observe(canvas);
    }

    dispose() {
        this.#observer?.disconnect();
        this.#observer = undefined!;
    }
}
