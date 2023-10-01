/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html } from "../../../base/web-components";
import { KCViewerAppElement } from "../common/app";
import { KCSchematicViewerElement } from "./viewer";

// import dependent elements so they're registered before use.
import "./info-panel";
import "./properties-panel";
import "./symbols-panel";
import "./viewer";
import type { ProjectPage } from "../../project";
import { KicadSch } from "../../../kicad";
import { SchematicSheet } from "../../../kicad/schematic";

/**
 * Internal "parent" element for KiCanvas's schematic viewer. Handles
 * setting up the schematic viewer as well as interface controls. It's
 * basically KiCanvas's version of EESchema.
 */
export class KCSchematicAppElement extends KCViewerAppElement<KCSchematicViewerElement> {
    override on_viewer_select(item?: unknown, previous?: unknown) {
        // Only handle double-selecting/double-clicking on items.
        if (!item || item != previous) {
            return;
        }

        // If it's a sheet instance, switch over to the new sheet.
        if (item instanceof SchematicSheet) {
            this.project.set_active_page(
                `${item.sheetfile}:${item.path}/${item.uuid}`,
            );
            return;
        }

        // Otherwise, selecting the same item twice should show the
        // properties panel.
        this.change_activity("properties");
    }

    override can_load(src: ProjectPage): boolean {
        return src.document instanceof KicadSch;
    }

    override make_viewer_element(): KCSchematicViewerElement {
        return html`<kc-schematic-viewer></kc-schematic-viewer>` as KCSchematicViewerElement;
    }

    override make_activities() {
        return [
            // Symbols
            html`<kc-ui-activity
                slot="activities"
                name="Symbols"
                icon="interests">
                <kc-schematic-symbols-panel></kc-schematic-symbols-panel>
            </kc-ui-activity>`,

            // Schematic item properties
            html`<kc-ui-activity
                slot="activities"
                name="Properties"
                icon="list">
                <kc-schematic-properties-panel></kc-schematic-properties-panel>
            </kc-ui-activity>`,

            // Schematic info
            html`<kc-ui-activity slot="activities" name="Info" icon="info">
                <kc-schematic-info-panel></kc-schematic-info-panel>
            </kc-ui-activity>`,
        ];
    }
}

window.customElements.define("kc-schematic-app", KCSchematicAppElement);
