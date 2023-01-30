/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../pcb/viewer";

export class KiCanvasBoardElement extends HTMLElement {
    #canvas: HTMLCanvasElement;
    viewer: BoardViewer;
    selected = [];

    constructor() {
        super();
    }

    get loaded() {
        return this.hasAttribute("loaded");
    }

    set loaded(value) {
        if (value) {
            this.setAttribute("loaded", "");
        } else {
            this.removeAttribute("loaded");
        }
    }

    async connectedCallback() {
        this.#renderShadowDOM();

        if (this.getAttribute("src")) {
            this.load(this.getAttribute("src"));
        }
    }

    async disconnectedCallback() {
        if (this.viewer) {
            this.viewer.dispose();
        }
        this.selected = null;
    }

    async load(src) {
        this.viewer = new BoardViewer(this.#canvas);

        await this.viewer.setup();
        await this.viewer.load(src);

        this.loaded = true;
        this.dispatchEvent(new CustomEvent("kicanvas:loaded"));

        this.viewer.draw_soon();
    }

    #renderShadowDOM() {
        const template = document.createElement("template");
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                    touch-action: none;
                }

                canvas {
                    width: 100%;
                    height: 100%;
                }
            </style>
            <canvas></canvas>
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
        this.#canvas = root.querySelector("canvas");
    }
}

window.customElements.define("kicanvas-board", KiCanvasBoardElement);
