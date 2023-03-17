/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { WithContext } from "../../../base/dom/context";
import { CustomElement, html } from "../../../base/dom/custom-element";
import { delegate } from "../../../base/events";
import { KCUIFilteredListElement } from "../../../kc-ui/kc-ui-filtered-list";
import { KCUITextFilterInputElement } from "../../../kc-ui/kc-ui-text-filter-input";
import {
    KiCanvasLoadEvent,
    KiCanvasSelectEvent,
} from "../../../viewers/base/events";
import { SchematicViewer } from "../../../viewers/schematic/viewer";

import "../../../kc-ui/kc-ui-filtered-list";
import "../../../kc-ui/kc-ui-panel";
import "../../../kc-ui/kc-ui-text-filter-input";

export class KCSchematicSymbolsPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: SchematicViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_initial_events();
        })();
    }

    private setup_initial_events() {
        delegate(this, "li[data-uuid]", "click", (e, source) => {
            const uuid = source.dataset["uuid"] as string;

            if (!uuid) {
                return;
            }

            this.viewer.select(uuid);
        });

        // Update the selected item in the list whenever the viewer's
        // selection changes.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, () => {
                this.mark_selected_item();
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

    private get search_input_elm() {
        return this.$<KCUITextFilterInputElement>("kc-ui-text-filter-input")!;
    }

    private get item_filter_elem() {
        return this.$<KCUIFilteredListElement>("kc-ui-filtered-list")!;
    }

    private get items() {
        return this.$$<HTMLLIElement>("li[data-uuid]");
    }

    private mark_selected_item() {
        for (const el of this.items) {
            const current =
                el.dataset["uuid"] == this.viewer.selected?.context.uuid;
            el.ariaCurrent = current ? "true" : "false";
        }
    }

    override render() {
        const collator = new Intl.Collator(undefined, { numeric: true });
        const schematic = this.viewer.schematic;
        const symbols = schematic.symbols.slice();
        const symbol_elms: HTMLElement[] = [];
        const power_symbol_elms: HTMLElement[] = [];

        symbols.sort((a, b) => collator.compare(a.reference, b.reference));

        for (const sym of symbols) {
            const match_text = `${sym.reference} ${sym.value} ${sym.id} ${sym.lib_symbol.name}`;
            const entry = html` <li
                data-uuid="${sym.uuid}"
                data-match-text="${match_text}"
                aria-role="button">
                <span class="narrow">${sym.reference}</span
                ><span>${sym.value}</span>
            </li>` as HTMLElement;
            if (sym.lib_symbol.power) {
                power_symbol_elms.push(entry);
            } else {
                symbol_elms.push(entry);
            }
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Symbols"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <kc-ui-text-filter-input></kc-ui-text-filter-input>
                    <kc-ui-filtered-list>
                        <ul class="item-list outline">
                            ${symbol_elms}
                            <li class="header">Power symbols</li>
                            ${power_symbol_elms}
                        </ul>
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
