/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { Footprint } from "../../board/items";
import { BoardViewer } from "../../board/viewer";
import { WithContext } from "../../dom/context";
import { CustomElement, html } from "../../dom/custom-elements";
import { KiCanvasSelectEvent } from "../../framework/events";
import { KCUIFilteredListElement } from "../kc-ui/kc-ui-filtered-list";
import { KCUITextFilterInputElement } from "../kc-ui/kc-ui-text-filter-input";

import "../kc-ui/kc-ui-filtered-list";
import "../kc-ui/kc-ui-text-filter-input";

export class KCBoardFootprintsPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: BoardViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            this.sort_footprints();
            super.connectedCallback();
            this.setup_events();
        })();
    }

    private sorted_footprints: Footprint[];
    private sort_footprints() {
        this.sorted_footprints = this.viewer.board.footprints.slice();
        this.sorted_footprints.sort((a, b) => {
            if (a.reference < b.reference) {
                return -1;
            }
            if (a.reference > b.reference) {
                return 1;
            }
            return 0;
        });
    }

    private setup_events() {
        // Wire up click to select items in the viewer
        this.addEventListener("click", (e) => {
            const li = (e.target as HTMLElement).closest(
                "li[data-uuid]",
            ) as HTMLLIElement | null;

            const uuid = li?.dataset["uuid"] as string;

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

        // Wire up search to filter the list
        this.search_input_elm.addEventListener("input", (e) => {
            this.item_filter_elem.filter_text =
                this.search_input_elm.value ?? null;
        });
    }

    private get search_input_elm(): KCUITextFilterInputElement {
        return this.renderRoot.querySelector("kc-ui-text-filter-input")!;
    }

    private get item_filter_elem(): KCUIFilteredListElement {
        return this.renderRoot.querySelector("kc-ui-filtered-list")!;
    }

    private get item_elms() {
        return this.renderRoot.querySelectorAll(
            "li[data-uuid]",
        ) as NodeListOf<HTMLLIElement>;
    }

    private mark_selected_item() {
        for (const el of this.item_elms) {
            const current =
                el.dataset["uuid"] == this.viewer.selected?.context.uuid;
            el.ariaCurrent = current ? "true" : "false";
        }
    }

    override render() {
        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>
                        Footprints
                    </kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <kc-ui-text-filter-input></kc-ui-text-filter-input>
                    <kc-ui-filtered-list>
                        <ul class="item-list outline">
                            ${this.render_list()}
                        </ul>
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

            const entry = html`<li
                data-uuid="${fp.uuid}"
                data-match-text="${match_text}"
                aria-role="button">
                <span class="narrow">${ref}</span><span>${val}</span>
            </li>`;

            if (fp.layer == "F.Cu") {
                front_footprints.push(entry);
            } else {
                back_footprints.push(entry);
            }
        }

        return html`<li class="header">Front</li>
            ${front_footprints}
            <li class="header">Back</li>
            ${back_footprints}`;
    }
}

window.customElements.define(
    "kc-board-footprints-panel",
    KCBoardFootprintsPanelElement,
);
