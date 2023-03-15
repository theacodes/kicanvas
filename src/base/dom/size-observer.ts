/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { IDisposable } from "../disposable";

type ResizeObserverCallback = (target: HTMLElement) => void;

/**
 * Wrapper over ResizeObserver that implmenets IDisposable
 */
export class SizeObserver implements IDisposable {
    #observer: ResizeObserver;

    constructor(
        public target: HTMLElement,
        private callback: ResizeObserverCallback,
    ) {
        this.#observer = new ResizeObserver(() => {
            this.callback(this.target);
        });
        this.#observer.observe(target);
    }

    dispose() {
        this.#observer?.disconnect();
        this.#observer = undefined!;
    }
}
