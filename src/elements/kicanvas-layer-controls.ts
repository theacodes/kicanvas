/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, CustomElement } from "../framework/elements";
import { LayerSet } from "../pcb/layers";
import { KiCanvasBoardElement } from "./kicanvas-board";
import styles from "./kicanvas-layer-controls.css";

export class KiCanvasLayerControlsElement extends CustomElement {
    static styles = styles;

    target: KiCanvasBoardElement;

    constructor() {
        super();
    }

    async connectedCallback() {
        if (!this.target) {
            const target_id = this.getAttribute("for");
            this.target = document.getElementById(
                target_id
            ) as KiCanvasBoardElement;
        }

        if (!this.target) {
            throw new Error("No target for <kicanvas-layer-controls>");
        }

        if (this.target.loaded) {
            super.connectedCallback();
        } else {
            this.target.addEventListener("kicanvas:loaded", () => {
                super.connectedCallback();
            });
        }
    }

    disconnectedCallback() {
        this.target = null;
    }

    override async render() {
        const layers = this.target.viewer.layers as LayerSet;
        const buttons = [];

        for (const layer of layers.in_ui_order()) {
            const visible = layer.visible ? "yes" : "no";
            const css_color = layer.color.to_css();
            buttons.push(html`
                <button type="button" name="${layer.name}" visible="${visible}">
                    <span class="color" style="background-color: ${css_color};"></span>
                    <span class="name">${layer.name}</name>
                </button>`);
        }

        const content = html`${buttons}`;

        this.shadowRoot.addEventListener("click", (e) => {
            this.#onClick(e);
        });

        return content;
    }

    #onClick(e) {
        const button = e.target.closest("button");
        if (!button) {
            return;
        }

        const layer = this.target.viewer.layers.by_name(
            button.getAttribute("name")
        );
        layer.visible = !layer.visible;
        button.setAttribute("visible", layer.visible ? "yes" : "no");
        this.target.viewer.draw_soon();
    }
}

window.customElements.define(
    "kicanvas-layer-controls",
    KiCanvasLayerControlsElement
);
