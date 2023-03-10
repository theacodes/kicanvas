/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { LayerSet } from "../../board/layers";
import { BoardViewer } from "../../board/viewer";
import { WithContext } from "../../dom/context";
import { CustomElement, html } from "../../dom/custom-elements";
import styles from "./kc-board-layers-panel.css";

export class KCBoardLayersPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    static override styles = styles;
    viewer: BoardViewer;

    get panel_body() {
        return this.renderRoot.querySelector("kc-ui-panel-body")!;
    }

    get items(): KCBoardLayerControlElement[] {
        return Array.from(
            this.panel_body?.querySelectorAll("kc-board-layer-control") ?? [],
        );
    }

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        // Highlight layer when its control list item is clicked
        this.panel_body.addEventListener(
            KCBoardLayerControlElement.select_event,
            (e: Event) => {
                const item = (e as CustomEvent)
                    .detail as KCBoardLayerControlElement;

                for (const n of this.items) {
                    n.layer_highlighted = false;
                }

                const layer = this.viewer.layers.by_name(item.layer_name!)!;

                // if this layer is already highlighted, de-highlight it.
                if (layer.highlighted) {
                    this.viewer.layers.highlight(null);
                }
                // otherwise mark it as highlighted.
                else {
                    this.viewer.layers.highlight(layer);
                    layer.visible = true;
                    item.layer_visible = true;
                    item.layer_highlighted = true;
                }

                this.viewer.draw();
            },
        );

        // Toggle layer visibility when its item's visibility control is clicked
        this.panel_body.addEventListener(
            KCBoardLayerControlElement.visibility_event,
            (e) => {
                const item = (e as CustomEvent)
                    .detail as KCBoardLayerControlElement;

                const layer = this.viewer.layers.by_name(item.layer_name!)!;

                // Toggle layer visibility
                layer.visible = !layer.visible;
                item.layer_visible = layer.visible;

                this.viewer.draw();
            },
        );

        // Show/hide all layers
        this.renderRoot
            .querySelector("button")
            ?.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.items.some((n) => n.layer_visible)) {
                    // hide all layers.
                    for (const item of this.items) {
                        item.layer_visible = false;
                        item.layer_highlighted = false;
                        this.viewer.layers.by_name(item.layer_name!)!.visible =
                            false;
                    }
                } else {
                    // show all layers
                    for (const item of this.items) {
                        item.layer_visible = true;
                        this.viewer.layers.by_name(item.layer_name!)!.visible =
                            true;
                    }
                }
                this.viewer.draw();
            });
    }

    override render() {
        const layers = this.viewer.layers as LayerSet;
        const items: ReturnType<typeof html>[] = [];

        for (const layer of layers.in_ui_order()) {
            const visible = layer.visible ? "visible" : "hidden";
            const css_color = layer.color.to_css();
            items.push(
                html` <kc-board-layer-control
                    layer-name="${layer.name}"
                    layer-color="${css_color}"
                    layer-visibility="${visible}"></kc-board-layer-control>`,
            );
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Layers</kc-ui-panel-header-text>
                    <kc-ui-panel-header-actions>
                        <button type="button">
                            <kc-ui-icon>visibility</kc-ui-icon>
                        </button>
                    </kc-ui-panel-header-actions>
                </kc-ui-panel-header>
                <kc-ui-panel-body> ${items} </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

class KCBoardLayerControlElement extends CustomElement {
    static override useShadowRoot = false;
    static select_event = "kicanvas:layer-control:select";
    static visibility_event = "kicanvas:layer-control:visibility";

    constructor() {
        super();
    }

    override initialContentCallback() {
        super.initialContentCallback();
        this.renderRoot.addEventListener("click", (e) => {
            e.stopPropagation();

            const button = (e.target as HTMLElement)?.closest("button");
            let event_name;

            // Visibility button clicked.
            if (button) {
                event_name = KCBoardLayerControlElement.visibility_event;
            }
            // Otherwise, some other part of the element was clicked so it's
            // "selected".
            else {
                event_name = KCBoardLayerControlElement.select_event;
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
        this.setBooleanAttribute("layer-highlighted", v);
    }

    get layer_highlighted(): boolean {
        return this.getBooleanAttribute("layer-highlighted");
    }

    set layer_visible(v: boolean) {
        this.setAttribute("layer-visibility", v ? "visible" : "hidden");

        if (!this.layer_visible) {
            this.layer_highlighted = false;
        }
    }

    get layer_visible(): boolean {
        if (!this.hasAttribute("layer-visibility")) {
            return true;
        }
        return this.getAttribute("layer-visibility") == "visible"
            ? true
            : false;
    }

    override render() {
        return html`<span
                class="color"
                style="background: ${this.layer_color};"></span>
            <span class="name">${this.layer_name}</span>
            <button type="button" name="${this.layer_name}">
                <kc-ui-icon class="icon for-visible">visibility</kc-ui-icon>
                <kc-ui-icon class="icon for-hidden">visibility_off</kc-ui-icon>
            </button>`;
    }
}

window.customElements.define(
    "kc-board-layer-control",
    KCBoardLayerControlElement,
);

window.customElements.define(
    "kc-board-layers-panel",
    KCBoardLayersPanelElement,
);
