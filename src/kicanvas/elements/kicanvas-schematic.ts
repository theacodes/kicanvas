/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../../base/elements/custom-element";
import { KiCanvasLoadEvent } from "../../viewers/base/events";
import type { KicadSch } from "../../kicad/schematic";
import { SchematicViewer } from "../../viewers/schematic/viewer";

export class KiCanvasSchematicElement extends CustomElement {
    #canvas: HTMLCanvasElement;
    viewer: SchematicViewer;
    selected: any[] = [];

    get loaded() {
        return this.getBooleanAttribute("loaded");
    }

    set loaded(value) {
        const old = this.loaded;
        this.setBooleanAttribute("loaded", value);
        if (value == true && !old) {
            this.dispatchEvent(new KiCanvasLoadEvent());
        }
    }

    override initialContentCallback() {
        (async () => {
            this.viewer = this.addDisposable(new SchematicViewer(this.#canvas));
            await this.viewer.setup();

            this.addDisposable(
                this.viewer.addEventListener(KiCanvasLoadEvent.type, () => {
                    this.loaded = true;
                }),
            );
        })();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.selected = [];
    }

    async load(src: KicadSch) {
        this.loaded = false;
        await this.viewer.load(src);
        this.viewer.draw();
    }

    override render() {
        this.#canvas = html`<canvas></canvas>` as HTMLCanvasElement;

        return html`<style>
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
