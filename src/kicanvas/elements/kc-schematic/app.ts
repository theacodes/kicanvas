/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, html } from "../../../base/web-components";
import { KCUIActivitySideBarElement, KCUIElement } from "../../../kc-ui";
import type { KicadSch } from "../../../kicad";
import { SchematicSheet } from "../../../kicad/schematic";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import { KCSchematicViewerElement } from "./viewer";

// import dependent elements so they're registered before use.
import "../help-panel";
import "./viewer";
import "../preferences-panel";
import "../viewer-bottom-toolbar";
import "./info-panel";
import "./properties-panel";
import "./symbols-panel";
import type { ProjectPage } from "../../project";

/**
 * Internal custom element for <kc-kicanvas-shell>'s schematic viewer. Handles
 * setting up the actual board viewer as well as interface controls. It's
 * basically KiCanvas's version of EESchema.
 */
export class KCSchematicAppElement extends KCUIElement {
    static override useShadowRoot = false;

    viewer_elm: KCSchematicViewerElement;
    activity_bar_elm: KCUIActivitySideBarElement;

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.viewer_elm.viewer;
    }

    @attribute({ type: String })
    controls: "none" | "basic" | "full";

    @attribute({ type: Boolean })
    sidebarcollapsed: boolean;

    override initialContentCallback() {
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                const item = e.detail.item;

                // Selecting the same item twice should show the properties panel.
                if (item && item == e.detail.previous) {
                    this.activity_bar_elm?.change_activity("properties");

                    // If the user clicked on a sheet instance, send this event
                    // upwards so kc-kicanvas-shell can load the sheet.
                    if (item instanceof SchematicSheet) {
                        this.dispatchEvent(
                            new CustomEvent("file:select", {
                                detail: {
                                    path: `${item.sheetfile}:${item.path}/${item.uuid}`,
                                },
                                composed: true,
                                bubbles: true,
                            }),
                        );
                    }
                }
            }),
        );
    }

    async load(src: KicadSch | ProjectPage) {
        await this.viewer_elm.load(src);
    }

    override render() {
        const controls = this.controls ?? "full";

        this.viewer_elm = html`<kc-schematic-viewer
            disableinteraction="${this.controls ==
            "none"}"></kc-schematic-viewer>` as KCSchematicViewerElement;

        let resizer = null;

        if (controls == "full") {
            this.activity_bar_elm = html`<kc-ui-activity-side-bar
                collapsed="${this.sidebarcollapsed}">
                <kc-ui-activity
                    slot="activities"
                    name="Symbols"
                    icon="interests">
                    <kc-schematic-symbols-panel></kc-schematic-symbols-panel>
                </kc-ui-activity>
                <kc-ui-activity slot="activities" name="Properties" icon="list">
                    <kc-schematic-properties-panel></kc-schematic-properties-panel>
                </kc-ui-activity>
                <kc-ui-activity slot="activities" name="Info" icon="info">
                    <kc-schematic-info-panel></kc-schematic-info-panel>
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
            resizer = html`<kc-ui-resizer></kc-ui-resizer>`;
        }

        let bottom_toolbar = null;
        if (controls != "none") {
            bottom_toolbar = html`<kc-viewer-bottom-toolbar></kc-viewer-bottom-toolbar>`;
        }

        return html`<kc-ui-split-view vertical>
            <kc-ui-view class="grow">
                ${this.viewer_elm} ${bottom_toolbar}
            </kc-ui-view>
            ${resizer} ${this.activity_bar_elm}
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-schematic-app", KCSchematicAppElement);
