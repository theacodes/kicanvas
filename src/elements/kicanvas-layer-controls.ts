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
import item_styles from "./kicanvas-layer-control-item.css";

export class KiCanvasLayerControlsElement extends CustomElement {
    static override styles = styles;

    target: KiCanvasBoardElement;

    constructor() {
        super();
    }

    get viewer() {
        return this.target.viewer;
    }

    get menu() {
        return this.renderRoot.querySelector("menu");
    }

    get menu_items(): KiCanvasLayerControlItemElement[] {
        return Array.from(
            this.menu?.querySelectorAll("kicanvas-layer-control-item") ?? [],
        );
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

        // Don't try to render until the viewer is loaded
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

    override async initialContentCallback(): Promise<void> {
        // Highlight layer when its control list item is clicked
        this.menu!.addEventListener(
            KiCanvasLayerControlItemElement.select_event,
            (e: Event) => {
                const item = (e as CustomEvent)
                    .detail as KiCanvasLayerControlItemElement;

                for (const n of this.menu_items) {
                    n.layer_highlighted = false;
                }

                const layer = this.viewer.layers.by_name(item.layer_name!)!;

                // if this layer is already highlighted, de-highlight it.
                if (this.viewer.layers.highlighted == layer) {
                    this.viewer.layers.highlight(null);
                }
                // otherwise mark it as highlighted.
                else {
                    this.viewer.layers.highlight(layer);
                    layer.visible = true;
                    item.layer_visible = true;
                    item.layer_highlighted = true;
                }

                this.viewer.draw_soon();
            },
        );

        // Toggle layer visibility when its item's visibility control is clicked
        this.menu!.addEventListener(
            KiCanvasLayerControlItemElement.visibility_event,
            (e) => {
                const item = (e as CustomEvent)
                    .detail as KiCanvasLayerControlItemElement;

                const layer = this.viewer.layers.by_name(item.layer_name!)!;

                // Toggle layer visibility
                layer.visible = !layer.visible;
                item.layer_visible = layer.visible;

                this.viewer.draw_soon();
            },
        );

        // Show/hide all layers
        this.renderRoot
            .querySelector("button")
            ?.addEventListener("click", (e) => {
                if (this.menu_items.some((n) => n.layer_visible)) {
                    // hide all layers.
                    for (const item of this.menu_items) {
                        item.layer_visible = false;
                        item.layer_highlighted = false;
                        this.viewer.layers.by_name(item.layer_name!)!.visible =
                            false;
                    }
                } else {
                    // show all layers
                    for (const item of this.menu_items) {
                        item.layer_visible = true;
                        this.viewer.layers.by_name(item.layer_name!)!.visible =
                            true;
                    }
                }
                this.viewer.draw_soon();
            });
    }

    override async render() {
        const layers = this.target.viewer.layers as LayerSet;
        const items: ReturnType<typeof html>[] = [];

        for (const layer of layers.in_ui_order()) {
            const visible = layer.visible ? "visible" : "hidden";
            const css_color = layer.color.to_css();
            items.push(
                html` <kicanvas-layer-control-item
                    layer-name="${layer.name}"
                    layer-color="${css_color}"
                    layer-visibility="${visible}"></kicanvas-layer-control-item>`,
            );
        }

        return html`
            <div>
                <span>Layers</span>
                <button type="button">
                    <span class="icon">visibility</span>
                </button>
            </div>
            <menu>${items}</menu>
        `;
    }
}

class KiCanvasLayerControlItemElement extends CustomElement {
    static override styles = item_styles;
    static select_event = "kicanvas:layer-control-item:select";
    static visibility_event = "kicanvas:layer-control-item:visibility";

    constructor() {
        super();
    }

    override async connectedCallback(): Promise<void> {
        this.layer_visible = true;

        await super.connectedCallback();

        this.renderRoot.addEventListener("click", (e) => {
            e.stopPropagation();

            const button = (e.target as HTMLElement)?.closest("button");
            let event_name;

            // Visibility button clicked.
            if (button) {
                event_name = KiCanvasLayerControlItemElement.visibility_event;
            }
            // Otherwise, some other part of the element was clicked so it's
            // "selected".
            else {
                event_name = KiCanvasLayerControlItemElement.select_event;
            }

            this.dispatchEvent(
                new CustomEvent(event_name, {
                    detail: this,
                    bubbles: true,
                }),
            );
        });
    }

    get layer_name() {
        return this.getAttribute("layer-name");
    }

    get layer_color() {
        return this.getAttribute("layer-color");
    }

    set layer_highlighted(v: boolean) {
        if (v) {
            this.setAttribute("layer-highlighted", "");
        } else {
            this.removeAttribute("layer-highlighted");
        }
    }

    get layer_highlighted(): boolean {
        return this.hasAttribute("layer-highlighted");
    }

    set layer_visible(v: boolean) {
        this.setAttribute("layer-visibility", v ? "visible" : "hidden");

        if (!this.layer_visible) {
            this.layer_highlighted = false;
        }
    }

    get layer_visible(): boolean {
        return this.getAttribute("layer-visibility") == "visible"
            ? true
            : false;
    }

    override async render() {
        return html`<span
                class="color"
                style="background-color: ${this.layer_color};"></span>
            <span class="name">${this.layer_name}</span>
            <button type="button" name="${this.layer_name}">
                <span class="icon for-visible">visibility</span>
                <span class="icon for-hidden">visibility_off</span>
            </button>`;
    }
}

window.customElements.define(
    "kicanvas-layer-control-item",
    KiCanvasLayerControlItemElement,
);

window.customElements.define(
    "kicanvas-layer-controls",
    KiCanvasLayerControlsElement,
);
