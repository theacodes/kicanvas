/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { SchematicViewer } from "../../../viewers/schematic/viewer";
import { WithContext } from "../../../base/dom/context";
import { html, CustomElement } from "../../../base/dom/custom-element";
import { KiCanvasLoadEvent } from "../../../viewers/base/events";

export class KCSchematicInfoPanel extends WithContext(CustomElement) {
    static override useShadowRoot = false;
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

        const header = (name: string) => html`<dt class="header">${name}</dt>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            html`<dt>${name}</dt>
                <dd>${desc} ${suffix}</dd>`;

        const comments = Object.entries(
            schematic.title_block?.comment || {},
        ).map(([k, v]) => entry(`Comment ${k}`, v));

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Info</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <dl class="property-list">
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
                        ${entry("Symbols", schematic.symbols.length)}
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
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-schematic-info-panel", KCSchematicInfoPanel);
