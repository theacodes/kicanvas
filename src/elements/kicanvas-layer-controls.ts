/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { LayerSet } from "../pcb/layers";
import { KiCanvasBoardElement } from "./kicanvas-board";

export class KiCanvasLayerControlsElement extends HTMLElement {
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
            this.#renderShadowDOM();
        } else {
            this.target.addEventListener("kicanvas:loaded", () => {
                this.#renderShadowDOM();
            });
        }
    }

    disconnectedCallback() {
        this.target = null;
    }

    #renderShadowDOM() {
        const layers = this.target.viewer.layers as LayerSet;
        const buttons = [];

        for (const layer of layers.in_ui_order()) {
            const visible = layer.visible ? "yes" : "no";
            const css_color = layer.color.to_css();
            buttons.push(`
                <button type="button" name="${layer.name}" visible="${visible}">
                    <span class="color" style="background-color: ${css_color};"></span>
                    <span class="name">${layer.name}</name>
                </button>`);
        }

        const template = document.createElement("template");
        template.innerHTML = `
            <style>
                *,
                *::before,
                *::after {
                    box-sizing: border-box;
                }

                * {
                    margin: 0;
                }

                :host {
                    box-sizing: border-box;
                    margin: 0;
                    flex-shrink: 1;
                    display: flex;
                    flex-direction: column;
                    background-color: #222;
                    padding: 0.5rem 0rem;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                button {
                    color: white;
                    background: transparent;
                    padding: 0.5rem 1rem;
                    text-align: left;
                    border: 0 none;
                    display: flex;
                    flex-direction: row;
                    width: 100%;
                }

                button:hover {
                    background-color: #333;
                }

                button[visible="no"] {
                    color: #888;
                }

                button .color {
                    flex-shrink: 0;
                    display: block;
                    width: 1rem;
                    height: 1rem;
                    margin-right: 0.5rem;
                }

                button .span {
                    display: block;
                    flex-shrink: 0;
                }
            </style>
            ${buttons.join("\n")}
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
        root.addEventListener("click", (e) => {
            this.#onClick(e);
        });
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
