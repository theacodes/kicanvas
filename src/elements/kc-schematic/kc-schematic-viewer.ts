/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { WithContext } from "../../dom/context";
import { CustomElement, html } from "../../dom/custom-elements";
import { KiCanvasSelectEvent } from "../../framework/events";
import { KiCanvasSchematicElement } from "../kicanvas-schematic";
import { KCUIActivitySideBarElement } from "../kc-ui/kc-ui-activity-side-bar";

// import dependent elements so they're registered before use.
import "../kc-ui/kc-ui-activity-side-bar";
import "./kc-schematic-properties-panel";

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
        this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
            // Selecting the same item twice should show the properties panel.
            if (e.detail.item && e.detail.item == e.detail.previous) {
                this.activity_bar_elm.change_activity("properties");
            }
        });
    }

    override disconnectedCallback() {}

    async load(src: File | string) {
        this.schematic_elm.load(src);
    }

    override render() {
        this.schematic_elm =
            html`<kicanvas-schematic></kicanvas-schematic>` as KiCanvasSchematicElement;

        this.activity_bar_elm = html`<kc-ui-activity-side-bar>
            <kc-ui-activity slot="activities" name="Properties" icon="list">
                <kc-schematic-properties-panel></kc-schematic-properties-panel>
            </kc-ui-activity>
        </kc-ui-activity-side-bar>` as KCUIActivitySideBarElement;

        return html` <kc-ui-split-view vertical>
            <kc-ui-view class="grow"> ${this.schematic_elm} </kc-ui-view>
            <kc-ui-view-resizer></kc-ui-view-resizer>
            ${this.activity_bar_elm}
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-schematic-viewer", KCSchematicViewerElement);
