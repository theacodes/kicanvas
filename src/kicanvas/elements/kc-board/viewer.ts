/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html } from "../../../base/web-components";
import { KCUIActivitySideBarElement, KCUIElement } from "../../../kc-ui";
import type { KicadPCB } from "../../../kicad";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import { KiCanvasBoardElement } from "../kicanvas-board";

// import dependent elements so they're registered before use.
import "../help-panel";
import "../kicanvas-board";
import "../preferences-panel";
import "../viewer-bottom-toolbar";
import "./footprints-panel";
import "./info-panel";
import "./layers-panel";
import "./nets-panel";
import "./objects-panel";
import "./properties-panel";

/**
 * Internal custom element for <kc-kicanvas-shell>'s board viewer. Handles
 * setting up the actual board viewer as well as interface controls. It's
 * basically KiCanvas's version of PCBNew.
 */
export class KCBoardViewerElement extends KCUIElement {
    static override useShadowRoot = false;

    board_elm: KiCanvasBoardElement;
    activity_bar_elm: KCUIActivitySideBarElement;

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.board_elm.viewer;
    }

    override initialContentCallback() {
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                // Selecting the same item twice should show the properties panel.
                if (e.detail.item && e.detail.item == e.detail.previous) {
                    this.activity_bar_elm.change_activity("properties");
                }
            }),
        );
    }

    async load(src: KicadPCB) {
        this.board_elm.load(src);
    }

    override render() {
        this.board_elm =
            html`<kicanvas-board></kicanvas-board>` as KiCanvasBoardElement;

        this.activity_bar_elm = html`<kc-ui-activity-side-bar>
            <kc-ui-activity slot="activities" name="Layers" icon="layers">
                <kc-board-layers-panel></kc-board-layers-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Objects" icon="category">
                <kc-board-objects-panel></kc-board-objects-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Footprints" icon="memory">
                <kc-board-footprints-panel></kc-board-footprints-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Nets" icon="hub">
                <kc-board-nets-panel></kc-board-nets-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Properties" icon="list">
                <kc-board-properties-panel></kc-board-properties-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Board info" icon="info">
                <kc-board-info-panel></kc-board-info-panel>
            </kc-ui-activity>
            <kc-ui-activity
                slot="activities"
                name="Preferences"
                icon="settings"
                button-location="bottom">
                <kc-preferences-panel></kc-preferences-panel>
            </kc-ui-activity>
            <kc-ui-activity
                slot="activities"
                name="Help"
                icon="help"
                button-location="bottom">
                <kc-help-panel></kc-help-panel>
            </kc-ui-activity>
        </kc-ui-activity-side-bar>` as KCUIActivitySideBarElement;

        return html` <kc-ui-split-view vertical>
            <kc-ui-view class="grow is-relative">
                ${this.board_elm}
                <kc-viewer-bottom-toolbar></kc-viewer-bottom-toolbar>
            </kc-ui-view>
            <kc-ui-resizer></kc-ui-resizer>
            ${this.activity_bar_elm}
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-board-viewer", KCBoardViewerElement);
