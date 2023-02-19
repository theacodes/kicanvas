/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../dom/custom-elements";
import { SchematicViewer } from "../sch/viewer";
import * as events from "../framework/events";

export class KiCanvasSchematicElement extends CustomElement {
    #canvas: HTMLCanvasElement;
    viewer: SchematicViewer;
    selected: any[] = [];

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

    override async initialContentCallback() {
        const src = this.getAttribute("src");
        if (src) {
            this.load(src);
        }
    }

    override async disconnectedCallback() {
        if (this.viewer) {
            this.viewer.dispose();
        }
        this.selected = [];
    }

    async load(src: File | string) {
        this.viewer = new SchematicViewer(this.#canvas);

        await this.viewer.setup();
        await this.viewer.load(src);

        this.loaded = true;
        this.dispatchEvent(new CustomEvent(events.names.load));

        this.viewer.draw_soon();
    }

    override async render() {
        this.#canvas = html`<canvas></canvas>` as HTMLCanvasElement;

        return html` <style>
                :host {
                    display: block;
                    touch-action: none;
                }

                canvas {
                    width: 100%;
                    height: 100%;
                }
            </style>
            ${this.#canvas}`;
    }
}

window.customElements.define("kicanvas-schematic", KiCanvasSchematicElement);
