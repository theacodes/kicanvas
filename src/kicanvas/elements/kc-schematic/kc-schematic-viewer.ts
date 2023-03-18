/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { WithContext } from "../../../base/dom/context";
import { CustomElement, html } from "../../../base/dom/custom-element";
import { KCUIActivitySideBarElement } from "../../../kc-ui/activity-side-bar";
import type { KicadSch } from "../../../kicad/schematic";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import { KiCanvasSchematicElement } from "../kicanvas-schematic";

// import dependent elements so they're registered before use.
import "../../../kc-ui/activity-side-bar";
import "../../../kc-ui/resizer";
import "../kc-viewer-bottom-toolbar";
import "../kicanvas-schematic";
import "./kc-schematic-info-panel";
import "./kc-schematic-properties-panel";
import "./kc-schematic-symbols-panel";

/**
 * Internal custom element for <kicanvas-app>'s board viewer. Handles setting
 * up the actual board viewer as well as interface controls. It's basically
 * KiCanvas's version of PCBNew.
 */
export class KCSchematicViewerElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;

    schematic_elm: KiCanvasSchematicElement;
    activity_bar_elm: KCUIActivitySideBarElement;

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.schematic_elm.viewer;
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

    async load(src: KicadSch) {
        this.schematic_elm.load(src);
    }

    override render() {
        this.schematic_elm =
            html`<kicanvas-schematic></kicanvas-schematic>` as KiCanvasSchematicElement;

        this.activity_bar_elm = html`<kc-ui-activity-side-bar>
            <kc-ui-activity slot="activities" name="Symbols" icon="interests">
                <kc-schematic-symbols-panel></kc-schematic-symbols-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Properties" icon="list">
                <kc-schematic-properties-panel></kc-schematic-properties-panel>
            </kc-ui-activity>
            <kc-ui-activity slot="activities" name="Info" icon="info">
                <kc-schematic-info-panel></kc-schematic-info-panel>
            </kc-ui-activity>
        </kc-ui-activity-side-bar>` as KCUIActivitySideBarElement;

        return html` <kc-ui-split-view vertical>
            <kc-ui-view class="grow">
                ${this.schematic_elm}
                <kc-viewer-bottom-toolbar></kc-viewer-bottom-toolbar>
            </kc-ui-view>
            <kc-ui-resizer></kc-ui-resizer>
            ${this.activity_bar_elm}
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-schematic-viewer", KCSchematicViewerElement);
