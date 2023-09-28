/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { sorted_by_numeric_strings } from "../../../base/array";
import { html, query } from "../../../base/web-components";
import {
    KCUIElement,
    KCUIFilteredListElement,
    KCUITextFilterInputElement,
    type KCUIMenuElement,
    type KCUIMenuItemElement,
} from "../../../kc-ui";
import {
    KiCanvasLoadEvent,
    KiCanvasSelectEvent,
} from "../../../viewers/base/events";
import { SchematicViewer } from "../../../viewers/schematic/viewer";

export class KCSchematicSymbolsPanelElement extends KCUIElement {
    viewer: SchematicViewer;

    @query("kc-ui-menu")
    private menu!: KCUIMenuElement;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_initial_events();
        })();
    }

    private setup_initial_events() {
        let updating_selected = false;

        this.addEventListener("kc-ui-menu:select", (e) => {
            if (updating_selected) {
                return;
            }

            const item = (e as CustomEvent).detail as KCUIMenuItemElement;
            if (!item.name) {
                return;
            }

            this.viewer.select(item.name);
        });

        // Update the selected item in the list whenever the viewer's
        // selection changes.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, () => {
                updating_selected = true;
                this.menu.selected = this.viewer.selected?.context.uuid ?? null;
                updating_selected = false;
            }),
        );

        // Re-render the entire component if a different schematic gets loaded.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasLoadEvent.type, () => {
                this.update();
            }),
        );
    }

    override renderedCallback() {
        // Wire up search to filter the list
        this.search_input_elm.addEventListener("input", (e) => {
            this.item_filter_elem.filter_text =
                this.search_input_elm.value ?? null;
        });
    }

    @query("kc-ui-text-filter-input", true)
    private search_input_elm!: KCUITextFilterInputElement;

    @query("kc-ui-filtered-list", true)
    private item_filter_elem!: KCUIFilteredListElement;

    override render() {
        const schematic = this.viewer.schematic;
        const symbol_elms: HTMLElement[] = [];
        const power_symbol_elms: HTMLElement[] = [];
        const sheet_elms: HTMLElement[] = [];

        const symbols = sorted_by_numeric_strings(
            Array.from(schematic.symbols.values()),
            (sym) => sym.reference,
        );

        for (const sym of symbols) {
            const match_text = `${sym.reference} ${sym.value} ${sym.id} ${sym.lib_symbol.name}`;
            const entry = html`<kc-ui-menu-item
                name="${sym.uuid}"
                data-match-text="${match_text}">
                <span class="narrow"> ${sym.reference} </span>
                <span> ${sym.value} </span>
            </kc-ui-menu-item>` as HTMLElement;

            if (sym.lib_symbol.power) {
                power_symbol_elms.push(entry);
            } else {
                symbol_elms.push(entry);
            }
        }

        const sheets = sorted_by_numeric_strings(
            schematic.sheets,
            (sheet) => sheet.sheetname ?? sheet.sheetfile ?? "",
        );

        for (const sheet of sheets) {
            const match_text = `${sheet.sheetname} ${sheet.sheetfile}`;
            sheet_elms.push(
                html`<kc-ui-menu-item
                    name="${sheet.uuid}"
                    data-match-text="${match_text}">
                    <span class="narrow"> ${sheet.sheetname}</span>
                    <span>${sheet.sheetfile}</span>
                </kc-ui-menu-item>` as HTMLElement,
            );
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Symbols"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <kc-ui-text-filter-input></kc-ui-text-filter-input>
                    <kc-ui-filtered-list>
                        <kc-ui-menu class="outline">
                            ${symbol_elms}
                            ${power_symbol_elms.length
                                ? html`<kc-ui-menu-label
                                      >Power symbols</kc-ui-menu-label
                                  >`
                                : null}
                            ${power_symbol_elms}
                            ${sheet_elms.length
                                ? html`<kc-ui-menu-label
                                      >Sheets</kc-ui-menu-label
                                  >`
                                : null}
                            ${sheet_elms}
                        </kc-ui-menu>
                    </kc-ui-filtered-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-schematic-symbols-panel",
    KCSchematicSymbolsPanelElement,
);
