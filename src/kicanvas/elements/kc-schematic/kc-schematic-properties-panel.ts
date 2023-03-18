/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { sorted_by_numeric_strings } from "../../../base/array";
import { html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import { SchematicSymbol } from "../../../kicad/schematic";
import {
    KiCanvasLoadEvent,
    KiCanvasSelectEvent,
} from "../../../viewers/base/events";
import { SchematicViewer } from "../../../viewers/schematic/viewer";

export class KCSchematicPropertiesPanelElement extends KCUIElement {
    viewer: SchematicViewer;
    selected_item?: SchematicSymbol;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_events();
        })();
    }

    private setup_events() {
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                this.selected_item = e.detail.item as SchematicSymbol;
                this.update();
            }),
        );

        // If a new schematic is loaded, clear the selected item.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasLoadEvent.type, (e) => {
                this.selected_item = undefined;
                this.update();
            }),
        );
    }

    override render() {
        const header = (name: string) =>
            html`<kc-ui-property-list-item
                class="label"
                name="${name}"></kc-ui-property-list-item>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            html`<kc-ui-property-list-item name="${name}">
                ${desc ?? ""} ${suffix}
            </kc-ui-property-list-item>`;

        const checkbox = (value?: boolean) =>
            value
                ? html`<kc-ui-icon>check</kc-ui-icon>`
                : html`<kc-ui-icon>close</kc-ui-icon>`;

        let entries;

        if (!this.selected_item) {
            entries = header("No item selected");
        } else {
            const itm = this.selected_item;
            const lib = itm.lib_symbol;

            const properties = Array.from(itm.properties.values()).map((v) => {
                return entry(v.name, v.text);
            });

            const pins = sorted_by_numeric_strings(
                itm.unit_pins,
                (pin) => pin.number,
            ).map((p) => {
                return entry(p.number, p.definition.name.text);
            });

            entries = html`
                ${header("Basic properties")}
                ${entry("X", itm.at.position.x.toFixed(4), "mm")}
                ${entry("Y", itm.at.position.y.toFixed(4), "mm")}
                ${entry("Orientation", itm.at.rotation, "°")}
                ${entry(
                    "Mirror",
                    itm.mirror == "x"
                        ? "Around X axis"
                        : itm.mirror == "y"
                        ? "Around Y axis"
                        : "Not mirrored",
                )}
                ${header("Instance properties")}
                ${entry("Library link", itm.lib_name ?? itm.lib_id)}
                ${itm.unit
                    ? entry(
                          "Unit",
                          String.fromCharCode("A".charCodeAt(0) + itm.unit - 1),
                      )
                    : ""}
                ${entry("In BOM", checkbox(itm.in_bom))}
                ${entry("On board", checkbox(itm.in_bom))}
                ${entry("Populate", checkbox(!itm.dnp))} ${header("Fields")}
                ${properties} ${header("Symbol properties")}
                ${entry("Name", lib.name)}
                ${entry("Description", lib.description)}
                ${entry("Keywords", lib.keywords)}
                ${entry("Power", checkbox(lib.power))}
                ${entry("Units", lib.unit_count)}
                ${entry(
                    "Units are interchangeable",
                    checkbox(lib.units_interchangable),
                )}
                ${header("Pins")} ${pins}
            `;
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Properties"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <kc-ui-property-list>${entries}</kc-ui-property-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-schematic-properties-panel",
    KCSchematicPropertiesPanelElement,
);
