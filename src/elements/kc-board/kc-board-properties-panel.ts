/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Footprint } from "../../board/items";
import { BoardViewer } from "../../board/viewer";
import { WithContext } from "../../base/elements/context";
import { CustomElement, html } from "../../base/elements/custom-element";
import { KiCanvasSelectEvent } from "../../framework/events";

export class KCBoardPropertiesPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: BoardViewer;
    selected_item?: Footprint;

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
                this.selected_item = e.detail.item as Footprint;
                this.update();
            }),
        );
    }

    override render() {
        const header = (name: string) => html`<dt class="header">${name}</dt>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            html`<dt>${name}</dt>
                <dd>${desc ?? ""} ${suffix}</dd>`;

        const checkbox = (value?: boolean) =>
            value
                ? html`<kc-ui-icon>check</kc-ui-icon>`
                : html`<kc-ui-icon>close</kc-ui-icon>`;

        let entries;

        if (!this.selected_item) {
            entries = header("No item selected");
        } else {
            const itm = this.selected_item;

            const properties = Object.entries(itm.properties).map(([k, v]) => {
                return entry(k, v);
            });

            entries = html`
                ${header("Basic properties")}
                ${entry("X", itm.at.position.x.toFixed(4), "mm")}
                ${entry("Y", itm.at.position.y.toFixed(4), "mm")}
                ${entry("Orientation", itm.at.rotation, "°")}
                ${entry("Layer", itm.layer)} ${header("Footprint properties")}
                ${entry("Reference", itm.reference)}
                ${entry("Value", itm.value)}
                ${entry(
                    "Type",
                    itm.attr.through_hole
                        ? "through hole"
                        : itm.attr.smd
                        ? "smd"
                        : "unspecified",
                )}
                ${entry("Pads", itm.pads.length)}
                ${entry("Library link", itm.library_link)}
                ${entry("Description", itm.descr)}
                ${entry("Keywords", itm.tags)} ${properties}
                ${header("Fabrication attributes")}
                ${entry("Not in schematic", checkbox(itm.attr.board_only))}
                ${entry(
                    "Exclude from position files",
                    checkbox(itm.attr.exclude_from_pos_files),
                )}
                ${entry(
                    "Exclude from BOM",
                    checkbox(itm.attr.exclude_from_bom),
                )}
                ${header("Overrides")}
                ${entry(
                    "Exempt from courtyard requirement",
                    checkbox(itm.attr.allow_missing_courtyard),
                )}
                ${entry("Clearance", itm.clearance ?? 0, "mm")}
                ${entry(
                    "Solderpaste margin",
                    itm.solder_paste_margin ?? 0,
                    "mm",
                )}
                ${entry(
                    "Solderpaste margin ratio",
                    itm.solder_paste_ratio ?? 0,
                )}
                ${entry("Zone connection", itm.zone_connect ?? "inherited")}
            `;
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>
                        Properties
                    </kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <dl class="property-list">${entries}</dl>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-board-properties-panel",
    KCBoardPropertiesPanelElement,
);
