/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, CustomElement } from "../dom/custom-elements";
import { KiCanvasBoardElement } from "./kicanvas-board";
import { KCLayerControlsElement } from "./kc-layer-controls";
import { KCBoardInfoPanelElement } from "./kc-board-info-panel";
import { KCBoardFootprintsPanelElement } from "./kc-board-footprints-panel";
import { KCBoardPropertiesPanelElement } from "./kc-board-properties-panel";
import { KCUIActivityBarElement } from "./kc-ui";
import { KiCanvasSelectEvent } from "../framework/events";
import { Footprint } from "../board/items";
import { WithContext } from "../dom/context";

import "./kc-layer-controls";
import "./kc-board-info-panel";
import "./kc-board-footprints-panel";
import "./kc-board-properties-panel";

/**
 * Internal custom element for <kicanvas-app>'s board viewer. Handles setting
 * up the actual board viewer as well as interface controls. It's basically
 * KiCanvas's version of PCBNew.
 */
export class KCBoardViewerElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;

    board_elm: KiCanvasBoardElement;
    activity_bar_elm: KCUIActivityBarElement;
    properties_panel_elm: KCBoardPropertiesPanelElement;
    footprints_panel_elm: KCBoardFootprintsPanelElement;

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.board_elm.viewer;
    }

    override initialContentCallback() {
        // When an item is selected, update the properties panel and footprints
        // panel.
        this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
            this.properties_panel_elm.selected_item = e.detail
                .item as Footprint;

            // Selecting the same item twice should show the properties panel.
            if (e.detail.item && e.detail.item == e.detail.previous) {
                this.activity_bar_elm.change_activity("properties");
            }
        });
    }

    override disconnectedCallback() {}

    async load(src: File | string) {
        this.board_elm.load(src);
    }

    override render() {
        this.board_elm =
            html`<kicanvas-board></kicanvas-board>` as KiCanvasBoardElement;

        this.activity_bar_elm = html`<kc-ui-activity-bar>
            <kc-ui-activity-bar-start>
                <button
                    tooltip-left="Layers"
                    name="layers"
                    aria-selected="true">
                    <kc-ui-icon>layers</kc-ui-icon>
                </button>
                <button tooltip-left="Objects" name="objects">
                    <kc-ui-icon>category</kc-ui-icon>
                </button>
                <button tooltip-left="Footprints" name="footprints">
                    <kc-ui-icon>footprint</kc-ui-icon>
                </button>
                <button tooltip-left="Nets" name="nets">
                    <kc-ui-icon>hub</kc-ui-icon>
                </button>
                <button tooltip-left="Properties" name="properties">
                    <kc-ui-icon>list</kc-ui-icon>
                </button>
                <button tooltip-left="Info" name="info">
                    <kc-ui-icon>info</kc-ui-icon>
                </button>
            </kc-ui-activity-bar-start>
            <kc-ui-activity-bar-end>
                <button tooltip-left="Help">
                    <kc-ui-icon>help</kc-ui-icon>
                </button>
            </kc-ui-activity-bar-end>
        </kc-ui-activity-bar>` as KCUIActivityBarElement;

        const layer_controls_elm =
            html`<kc-layer-controls></kc-layer-controls>` as KCLayerControlsElement;

        this.footprints_panel_elm =
            html`<kc-board-footprints-panel></kc-board-footprints-panel>` as KCBoardFootprintsPanelElement;

        const info_panel_elm =
            html`<kc-board-info-panel></kc-board-info-panel>` as KCBoardInfoPanelElement;

        this.properties_panel_elm =
            html`<kc-board-properties-panel></kc-board-properties-panel>` as KCBoardPropertiesPanelElement;

        return html` <kc-ui-split-view vertical>
            <kc-ui-view class="grow"> ${this.board_elm} </kc-ui-view>
            <kc-ui-view-resizer></kc-ui-view-resizer>
            <kc-ui-split-view vertical class="activity-container">
                <kc-ui-view class="fixed activity-bar-container">
                    ${this.activity_bar_elm}
                </kc-ui-view>
                <kc-ui-view class="activity-item-container">
                    <kc-ui-activity name="layers" active>
                        ${layer_controls_elm}
                    </kc-ui-activity>
                    <kc-ui-activity name="objects">
                        <kc-ui-panel>
                            <kc-ui-panel-header>
                                <kc-ui-panel-header-text>
                                    Objects
                                </kc-ui-panel-header-text>
                            </kc-ui-panel-header>
                        </kc-ui-panel>
                    </kc-ui-activity>
                    <kc-ui-activity name="footprints">
                        ${this.footprints_panel_elm}
                    </kc-ui-activity>
                    <kc-ui-activity name="nets">
                        <kc-ui-panel>
                            <kc-ui-panel-header>
                                <kc-ui-panel-header-text>
                                    Nets
                                </kc-ui-panel-header-text>
                            </kc-ui-panel-header>
                        </kc-ui-panel>
                    </kc-ui-activity>
                    <kc-ui-activity name="properties">
                        ${this.properties_panel_elm}
                    </kc-ui-activity>
                    <kc-ui-activity name="info">
                        ${info_panel_elm}
                    </kc-ui-activity>
                </kc-ui-view>
            </kc-ui-split-view>
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-board-viewer", KCBoardViewerElement);
