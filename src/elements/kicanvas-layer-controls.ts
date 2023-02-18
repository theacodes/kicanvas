/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, CustomElement } from "../dom/custom-elements";
import { LayerSet } from "../pcb/layers";
import { KiCanvasBoardElement } from "./kicanvas-board";
import * as events from "../framework/events";
import styles from "./kicanvas-layer-controls.css";

export class KiCanvasLayerControlsElement extends CustomElement {
    static override styles = styles;

    target: KiCanvasBoardElement;

    constructor() {
        super();
    }

    override async connectedCallback() {
        if (!this.target) {
            const target_id = this.getAttribute("for");
            if (target_id) {
                this.target = document.getElementById(
                    target_id,
                ) as KiCanvasBoardElement;
            }
        }

        if (!this.target) {
            throw new Error("No target for <kicanvas-layer-controls>");
        }

        if (this.target.loaded) {
            await super.connectedCallback();
        } else {
            this.target.addEventListener(events.names.load, async () => {
                await super.connectedCallback();
            });
        }
    }

    disconnectedCallback() {
        this.target = undefined!;
    }

    get menu() {
        return this.shadowRoot?.querySelector("menu");
    }

    override async renderedCallback(root: ShadowRoot): Promise<void> {
        this.menu!.addEventListener("click", (e) => {
            console.log(e);
            this.#onClick(e);
        });
    }

    override async render() {
        const layers = this.target.viewer.layers as LayerSet;
        const buttons: ReturnType<typeof html>[] = [];

        for (const layer of layers.in_ui_order()) {
            const visible = layer.visible ? "visible" : "hidden";
            const css_color = layer.color.to_css();
            buttons.push(
                html`<li
                    data-layer-name="${layer.name}"
                    data-layer-visibility="${visible}">
                    <span
                        class="color"
                        style="background-color: ${css_color};"></span>
                    <span class="name">${layer.name}</span>
                    <button type="button" name="${layer.name}">
                        <span
                            class="icon material-symbols-outlined"
                            data-layer-visibility="visible">
                            visibility
                        </span>
                        <span
                            class="icon material-symbols-outlined"
                            data-layer-visibility="hidden">
                            visibility_off
                        </span>
                    </button>
                </li>`,
            );
        }

        return html`<menu>${buttons}</menu>`;
    }

    #onClick(e: Event) {
        const button = (e.target as HTMLElement)?.closest("button");
        const li = (e.target as HTMLElement)?.closest("li");
        const name = li?.dataset["layerName"];

        if (!li || !name) {
            return;
        }

        const layer = this.target.viewer.layers.by_name(name)!;

        if (button) {
            // Toggle layer visibility
            layer.visible = !layer.visible;
            li.dataset["layerVisibility"] = layer.visible
                ? "visible"
                : "hidden";

            if (!layer.visible) {
                delete li.dataset["layerHighlighted"];
            }
        } else {
            // Highlight layer
            this.menu!.querySelectorAll("li").forEach((elem) => {
                delete elem.dataset["layerHighlighted"];
            });

            this.target.viewer.layers.highlight(layer);
            layer.visible = true;

            li.dataset["layerHighlighted"] = "";
            li.dataset["layerVisibility"] = "visible";
        }

        this.target.viewer.draw_soon();
    }
}

window.customElements.define(
    "kicanvas-layer-controls",
    KiCanvasLayerControlsElement,
);
