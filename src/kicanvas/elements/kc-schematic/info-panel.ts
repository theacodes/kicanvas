/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import { KiCanvasLoadEvent } from "../../../viewers/base/events";
import { SchematicViewer } from "../../../viewers/schematic/viewer";

export class KCSchematicInfoPanel extends KCUIElement {
    viewer: SchematicViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();

            // If a new schematic is loaded, re-render
            this.addDisposable(
                this.viewer.addEventListener(KiCanvasLoadEvent.type, (e) => {
                    this.update();
                }),
            );
        })();
    }

    override render() {
        const ds = this.viewer.drawing_sheet;
        const schematic = this.viewer.schematic;

        const header = (name: string) =>
            html`<kc-ui-property-list-item
                class="label"
                name="${name}"></kc-ui-property-list-item>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            html`<kc-ui-property-list-item name="${name}">
                ${desc} ${suffix}
            </kc-ui-property-list-item>`;

        const comments = Object.entries(
            schematic.title_block?.comment || {},
        ).map(([k, v]) => entry(`Comment ${k}`, v));

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Info"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <kc-ui-property-list>
                        ${header("Page properties")}
                        ${entry("Size", ds.paper?.size)}
                        ${entry("Width", ds.width, "mm")}
                        ${entry("Height", ds.height, "mm")}
                        ${header("Schematic properties")}
                        ${entry("KiCAD version", schematic.version)}
                        ${entry("Generator", schematic.generator)}
                        ${entry("Title", schematic.title_block?.title)}
                        ${entry("Date", schematic.title_block?.date)}
                        ${entry("Revision", schematic.title_block?.rev)}
                        ${entry("Company", schematic.title_block?.company)}
                        ${comments}
                        ${entry("Symbols", schematic.symbols.size)}
                        ${entry(
                            "Unique symbols",
                            schematic.lib_symbols?.symbols.length ?? 0,
                        )}
                        ${entry("Wires", schematic.wires.length)}
                        ${entry("Buses", schematic.buses.length)}
                        ${entry("Junctions", schematic.junctions.length)}
                        ${entry("Net labels", schematic.net_labels.length)}
                        ${entry(
                            "Global labels",
                            schematic.global_labels.length,
                        )}
                        ${entry(
                            "Hierarchical labels",
                            schematic.hierarchical_labels.length,
                        )}
                        ${entry("No connects", schematic.no_connects.length)}
                    </dl>
                </kc-ui-property-list>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-schematic-info-panel", KCSchematicInfoPanel);
