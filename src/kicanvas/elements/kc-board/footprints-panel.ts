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
    KCUIMenuElement,
    KCUITextFilterInputElement,
    type KCUIMenuItemElement,
} from "../../../kc-ui";
import type { Footprint } from "../../../kicad/board";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import { BoardViewer } from "../../../viewers/board/viewer";

export class KCBoardFootprintsPanelElement extends KCUIElement {
    viewer: BoardViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            this.sort_footprints();
            super.connectedCallback();
        })();
    }

    @query("kc-ui-menu", true)
    private menu!: KCUIMenuElement;

    private sorted_footprints: Footprint[];
    private sort_footprints() {
        this.sorted_footprints = sorted_by_numeric_strings(
            this.viewer.board.footprints,
            (fp) => fp.reference || "REF",
        );
    }

    override initialContentCallback() {
        this.addEventListener("kc-ui-menu:select", (e) => {
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
                this.menu.selected =
                    this.viewer.selected?.context.uuid_text ?? null;
            }),
        );

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
        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Footprints"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <kc-ui-text-filter-input></kc-ui-text-filter-input>
                    <kc-ui-filtered-list>
                        <kc-ui-menu class="outline">
                            ${this.render_list()}
                        </kc-ui-menu>
                    </kc-ui-filtered-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }

    private render_list() {
        const front_footprints = [];
        const back_footprints = [];

        for (const fp of this.sorted_footprints) {
            const ref = fp.reference || "REF";
            const val = fp.value || "VAL";
            const match_text = `${fp.library_link} ${fp.descr} ${fp.layer} ${ref} ${val} ${fp.tags}`;

            const entry = html`<kc-ui-menu-item
                name="${fp.unique_id}"
                data-match-text="${match_text}">
                <span class="narrow">${ref}</span><span>${val}</span>
            </kc-ui-menu-item>`;

            if (fp.layer == "F.Cu") {
                front_footprints.push(entry);
            } else {
                back_footprints.push(entry);
            }
        }

        return html`<kc-ui-menu-label>Front</kc-ui-menu-label>
            ${front_footprints}
            <kc-ui-menu-label>Back</kc-ui-menu-label>
            ${back_footprints}`;
    }
}

window.customElements.define(
    "kc-board-footprints-panel",
    KCBoardFootprintsPanelElement,
);
