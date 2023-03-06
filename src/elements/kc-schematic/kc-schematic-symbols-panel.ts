/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { SchematicViewer } from "../../schematic/viewer";
import { WithContext } from "../../dom/context";
import { html, CustomElement } from "../../dom/custom-elements";
import { KiCanvasSelectEvent } from "../../framework/events";

export class KCSchematicSymbolsPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: SchematicViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_events();
        })();
    }

    private setup_events() {
        this.addEventListener("click", (e) => {
            const li = (e.target as HTMLElement).closest(
                "li[data-uuid]",
            ) as HTMLLIElement | null;

            const uuid = li?.dataset["uuid"] as string;

            if (!uuid) {
                return;
            }

            //this.viewer.select(uuid);
        });

        // Update the selected item in the list whenever the viewer's
        // selection changes.
        this.viewer.addEventListener(KiCanvasSelectEvent.type, () => {
            this.mark_selected_item();
        });
    }

    private get items() {
        return this.renderRoot.querySelectorAll(
            "li[data-uuid]",
        ) as NodeListOf<HTMLLIElement>;
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
        const symbol_elms: string[] = [];
        const power_symbol_elms: string[] = [];

        symbols.sort((a, b) => collator.compare(a.reference, b.reference));

        for (const sym of symbols) {
            const entry = `<li data-uuid="${sym.uuid}" aria-role="button"><span class="narrow">${sym.reference}</span><span>${sym.value}</span></li>`;
            if (sym.lib_symbol.power) {
                power_symbol_elms.push(entry);
            } else {
                symbol_elms.push(entry);
            }
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Symbols</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <ul class="item-list outline">
                        ${symbol_elms}
                        <li class="header">Power symbols</dt>
                        ${power_symbol_elms}
                    </ul>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-schematic-symbols-panel",
    KCSchematicSymbolsPanelElement,
);
