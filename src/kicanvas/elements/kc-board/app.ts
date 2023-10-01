/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html } from "../../../base/web-components";
import { KicadPCB } from "../../../kicad";
import type { ProjectPage } from "../../project";
import { KCViewerAppElement } from "../common/app";
import { KCBoardViewerElement } from "./viewer";

// import dependent elements so they're registered before use.
import "../common/help-panel";
import "../common/preferences-panel";
import "../common/viewer-bottom-toolbar";
import "./footprints-panel";
import "./info-panel";
import "./layers-panel";
import "./nets-panel";
import "./objects-panel";
import "./properties-panel";
import "./viewer";

/**
 * Internal "parent" element for KiCanvas's board viewer. Handles
 * setting up the actual board viewer as well as interface controls. It's
 * basically KiCanvas's version of PCBNew.
 */
export class KCBoardAppElement extends KCViewerAppElement<KCBoardViewerElement> {
    override on_viewer_select(item?: unknown, previous?: unknown) {
        // Selecting the same item twice should show the properties panel.
        if (item && item == previous) {
            this.change_activity("properties");
        }
    }

    override can_load(src: ProjectPage): boolean {
        return src.document instanceof KicadPCB;
    }

    override make_viewer_element(): KCBoardViewerElement {
        return html`<kc-board-viewer></kc-board-viewer>` as KCBoardViewerElement;
    }

    override make_activities() {
        return [
            // Layers
            html`<kc-ui-activity slot="activities" name="Layers" icon="layers">
                <kc-board-layers-panel></kc-board-layers-panel>
            </kc-ui-activity>`,
            // Objects
            html`<kc-ui-activity
                slot="activities"
                name="Objects"
                icon="category">
                <kc-board-objects-panel></kc-board-objects-panel>
            </kc-ui-activity>`,
            // Footprints
            html`<kc-ui-activity
                slot="activities"
                name="Footprints"
                icon="memory">
                <kc-board-footprints-panel></kc-board-footprints-panel>
            </kc-ui-activity>`,
            // Nets
            html`<kc-ui-activity slot="activities" name="Nets" icon="hub">
                <kc-board-nets-panel></kc-board-nets-panel>
            </kc-ui-activity>`,
            // Properties
            html`<kc-ui-activity
                slot="activities"
                name="Properties"
                icon="list">
                <kc-board-properties-panel></kc-board-properties-panel>
            </kc-ui-activity>`,
            // Board info
            html`<kc-ui-activity
                slot="activities"
                name="Board info"
                icon="info">
                <kc-board-info-panel></kc-board-info-panel>
            </kc-ui-activity>`,
        ];
    }
}

window.customElements.define("kc-board-app", KCBoardAppElement);
