/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, css, html, query } from "../../../base/web-components";
import {
    KCUIElement,
    KCUIMenuElement,
    type KCUIMenuItemElement,
    type KCUIPanelBodyElement,
} from "../../../kc-ui";
import { LayerNames, LayerSet } from "../../../viewers/board/layers";
import { BoardViewer } from "../../../viewers/board/viewer";

export class KCBoardLayersPanelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: block;
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
                user-select: none;
            }

            kc-ui-panel-title button {
                all: unset;
                flex-shrink: 0;
                margin-left: 1em;
                color: white;
                border: 0 none;
                background: transparent;
                padding: 0 0.25em 0 0.25em;
                margin-right: -0.25em;
                display: flex;
                align-items: center;
            }
        `,
    ];

    viewer: BoardViewer;

    @query("kc-ui-panel-body", true)
    private panel_body!: KCUIPanelBodyElement;

    private get items(): KCBoardLayerControlElement[] {
        return Array.from(
            this.panel_body.querySelectorAll("kc-board-layer-control") ?? [],
        );
    }

    @query("#presets", true)
    private presets_menu!: KCUIMenuElement;

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

                // Deselect any presets, as we're no longer showing preset layers.
                this.presets_menu.deselect();

                this.viewer.draw();
            },
        );

        // Show/hide all layers
        this.renderRoot
            .querySelector("button")
            ?.addEventListener("click", (e) => {
                e.stopPropagation();

                const ui_layers = this.viewer.layers.in_ui_order();

                if (this.items.some((n) => n.layer_visible)) {
                    // hide all layers.
                    for (const l of ui_layers) {
                        l.visible = false;
                    }
                } else {
                    // show all layers
                    for (const l of ui_layers) {
                        l.visible = true;
                    }
                }

                this.viewer.draw();

                // Deselect any presets, as we're no longer showing preset layers.
                this.presets_menu.deselect();

                this.update_item_states();
            });

        // Presets
        this.presets_menu.addEventListener("kc-ui-menu:select", (e) => {
            const item = (e as CustomEvent).detail as KCUIMenuItemElement;
            const ui_layers = this.viewer.layers.in_ui_order();

            switch (item.name) {
                case "all":
                    for (const l of ui_layers) {
                        l.visible = true;
                    }
                    break;
                case "front":
                    for (const l of ui_layers) {
                        l.visible =
                            l.name.startsWith("F.") ||
                            l.name == LayerNames.edge_cuts;
                    }
                    break;
                case "back":
                    for (const l of ui_layers) {
                        l.visible =
                            l.name.startsWith("B.") ||
                            l.name == LayerNames.edge_cuts;
                    }
                    break;
                case "copper":
                    for (const l of ui_layers) {
                        l.visible =
                            l.name.includes(".Cu") ||
                            l.name == LayerNames.edge_cuts;
                    }
                    break;
                case "outer-copper":
                    for (const l of ui_layers) {
                        l.visible =
                            l.name == LayerNames.f_cu ||
                            l.name == LayerNames.b_cu ||
                            l.name == LayerNames.edge_cuts;
                    }
                    break;
                case "inner-copper":
                    for (const l of ui_layers) {
                        l.visible =
                            (l.name.includes(".Cu") &&
                                !(
                                    l.name == LayerNames.f_cu ||
                                    l.name == LayerNames.b_cu
                                )) ||
                            l.name == LayerNames.edge_cuts;
                    }
                    break;
                case "drawings":
                    for (const l of ui_layers) {
                        l.visible =
                            !l.name.includes(".Cu") &&
                            !l.name.includes(".Mask") &&
                            !l.name.includes(".Paste") &&
                            !l.name.includes(".Adhes");
                    }
            }

            this.viewer.draw();
            this.update_item_states();
        });
    }

    private update_item_states() {
        for (const item of this.items) {
            const layer = this.viewer.layers.by_name(item.layer_name!);
            item.layer_visible = layer?.visible ?? false;
            item.layer_highlighted = layer?.highlighted ?? false;
        }
    }

    override render() {
        const layers = this.viewer.layers as LayerSet;
        const items: ReturnType<typeof html>[] = [];

        for (const layer of layers.in_ui_order()) {
            const visible = layer.visible ? "" : undefined;
            const css_color = layer.color.to_css();
            items.push(
                html`<kc-board-layer-control
                    layer-name="${layer.name}"
                    layer-color="${css_color}"
                    layer-visible="${visible}"></kc-board-layer-control>`,
            );
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Layers">
                    <button slot="actions" type="button">
                        <kc-ui-icon>visibility</kc-ui-icon>
                    </button>
                </kc-ui-panel-title>
                <kc-ui-panel-body>
                    ${items}
                    <kc-ui-panel-label>Presets</kc-ui-panel-label>
                    <kc-ui-menu id="presets" class="outline">
                        <kc-ui-menu-item name="all">All</kc-ui-menu-item>
                        <kc-ui-menu-item name="front">Front</kc-ui-menu-item>
                        <kc-ui-menu-item name="back">Back</kc-ui-menu-item>
                        <kc-ui-menu-item name="copper">Copper</kc-ui-menu-item>
                        <kc-ui-menu-item name="outer-copper">
                            Outer copper
                        </kc-ui-menu-item>
                        <kc-ui-menu-item name="inner-copper">
                            Inner copper
                        </kc-ui-menu-item>
                        <kc-ui-menu-item name="drawings">
                            Drawings
                        </kc-ui-menu-item>
                    </kc-ui-menu>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

class KCBoardLayerControlElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                box-sizing: border-box;
                padding: 0.1em 0.8em 0.1em 0.4em;
                color: white;
                text-align: left;
                display: flex;
                flex-direction: row;
                width: 100%;
                align-items: center;
            }

            button {
                all: unset;
                cursor: pointer;
                flex-shrink: 0;
                margin-left: 1em;
                color: white;
                border: 0 none;
                background: transparent;
                padding: 0 0.25em 0 0.25em;
                margin-right: -0.25em;
                display: flex;
                align-items: center;
            }

            .color {
                flex-shrink: 0;
                display: block;
                width: 1em;
                height: 1em;
                margin-right: 0.5em;
            }

            .name {
                display: block;
                flex-grow: 1;
            }

            .for-hidden {
                color: #888;
            }

            :host {
                background: var(--list-item-disabled-bg);
                color: var(--list-item-disabled-fg);
            }

            :host(:hover) {
                background: var(--list-item-hover-bg);
                color: var(--list-item-hover-fg);
            }

            :host(:hover) button {
                color: var(--list-item-bg);
            }

            :host(:hover) button:hover {
                color: var(--list-item-fg);
            }

            :host([layer-visible]) {
                background: var(--list-item-bg);
                color: var(--list-item-fg);
            }

            :host([layer-highlighted]) {
                background: var(--list-item-active-bg);
                color: var(--list-item-active-fg);
            }

            :host([layer-highlighted]:hover) button {
                color: var(--list-item-fg);
            }

            :host kc-ui-icon.for-visible,
            :host([layer-visible]) kc-ui-icon.for-hidden {
                display: none;
            }

            :host kc-ui-icon.for-hidden,
            :host([layer-visible]) kc-ui-icon.for-visible {
                display: revert;
            }
        `,
    ];

    static select_event = "kicanvas:layer-control:select";
    static visibility_event = "kicanvas:layer-control:visibility";

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

    @attribute({ type: String })
    public layer_name: string;

    @attribute({ type: String })
    public layer_color: string;

    @attribute({ type: Boolean })
    public layer_highlighted: boolean;

    @attribute({ type: Boolean })
    public layer_visible: boolean;

    override render() {
        return html`<span
                class="color"
                style="background: ${this.layer_color};"></span>
            <span class="name">${this.layer_name}</span>
            <button type="button" name="${this.layer_name}">
                <kc-ui-icon class="for-visible">visibility</kc-ui-icon>
                <kc-ui-icon class="for-hidden">visibility_off</kc-ui-icon>
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
