/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Footprint } from "../../board/items";
import { WithContext } from "../../dom/context";
import { CustomElement, html } from "../../dom/custom-elements";
import { KiCanvasSelectEvent } from "../../framework/events";
import { KCUIActivitySideBarElement } from "../kc-ui-activity-side-bar";
import { KiCanvasBoardElement } from "../kicanvas-board";
import { KCBoardPropertiesPanelElement } from "./kc-board-properties-panel";

// import dependent elements so they're registered before use.
import "../kc-ui-activity-side-bar";
import "./kc-board-footprints-panel";
import "./kc-board-info-panel";
import "./kc-board-layers-panel";
import "./kc-board-nets-panel";
import "./kc-board-objects-panel";
import "./kc-board-properties-panel";

/**
 * Internal custom element for <kicanvas-app>'s board viewer. Handles setting
 * up the actual board viewer as well as interface controls. It's basically
 * KiCanvas's version of PCBNew.
 */
export class KCBoardViewerElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;

    board_elm: KiCanvasBoardElement;
    activity_bar_elm: KCUIActivitySideBarElement;
    properties_panel_elm: KCBoardPropertiesPanelElement;

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

        this.properties_panel_elm =
            html`<kc-board-properties-panel></kc-board-properties-panel>` as KCBoardPropertiesPanelElement;

        this.activity_bar_elm = html`<kc-ui-activity-side-bar>
            <kc-ui-activity slot="activities" name="Layers" icon="layers">
                <kc-board-layers-panel></kc-board-layers-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Objects" icon="category">
                <kc-board-objects-panel></kc-board-objects-panel>
            </kc-ui-activity>
            <kc-ui-activity
                slot="activities"
                name="Footprints"
                icon="footprint">
                <kc-board-footprints-panel></kc-board-footprints-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Nets" icon="hub">
                <kc-board-nets-panel></kc-board-nets-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Properties" icon="list">
                ${this.properties_panel_elm}
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Board info" icon="info">
                <kc-board-info-panel></kc-board-info-panel>
            </kc-ui-activity>
            <kc-ui-activity
                slot="activities"
                name="Help"
                icon="help"
                button-location="bottom">
            </kc-ui-activity>
        </kc-ui-activity-side-bar>` as KCUIActivitySideBarElement;

        return html` <kc-ui-split-view vertical>
            <kc-ui-view class="grow"> ${this.board_elm} </kc-ui-view>
            <kc-ui-view-resizer></kc-ui-view-resizer>
            ${this.activity_bar_elm}
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-board-viewer", KCBoardViewerElement);
