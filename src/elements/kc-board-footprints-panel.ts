/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../board/viewer";
import { html, CustomElement } from "../dom/custom-elements";
import { KiCanvasSelectEvent } from "../framework/events";
import { NeedsViewer } from "./kc-mixins";

export class KCBoardFootprintsPanelElement extends NeedsViewer(
    CustomElement,
    BoardViewer,
) {
    static override useShadowRoot = false;

    override connectedCallback() {
        (async () => {
            await this.viewer_loaded();
            super.connectedCallback();
        })();

        this.addEventListener("click", (e) => {
            const li = (e.target as HTMLElement).closest(
                "li[data-uuid]",
            ) as HTMLLIElement;

            if (!li) {
                return;
            }

            const uuid = li.dataset["uuid"] as string;

            if (this.viewer.selected?.context.uuid == uuid) {
                // clicking twice should move to the properties panel
                this.dispatchEvent(
                    new KiCanvasSelectEvent({
                        item: this.viewer.selected?.context,
                    }),
                );
            } else {
                // clicking once just highlights the item.
                // TODO: this should maybe just be an event as well?
                this.viewer.select(li.dataset["uuid"] as string);
            }

            this.mark_selected_item();
        });
    }

    private get items() {
        return this.renderRoot.querySelectorAll(
            "li[data-uuid]",
        ) as NodeListOf<HTMLLIElement>;
    }

    mark_selected_item() {
        for (const el of this.items) {
            const current =
                el.dataset["uuid"] == this.viewer.selected?.context.uuid;
            el.ariaCurrent = current ? "true" : "false";
        }
    }

    override render() {
        const board = this.viewer.board;
        const footprints = board.footprints.slice();
        const front_footprints = [];
        const back_footprints = [];

        footprints.sort((a, b) => {
            if (a.reference < b.reference) {
                return -1;
            }
            if (a.reference > b.reference) {
                return 1;
            }
            return 0;
        });

        for (const fp of footprints) {
            const ref = fp.reference || "REF";
            const val = fp.value || "VAL";
            const entry = `<li data-uuid="${fp.uuid}" aria-role="button"><span class="narrow">${ref}</span><span>${val}</span></li>`;
            if (fp.layer == "F.Cu") {
                front_footprints.push(entry);
            } else {
                back_footprints.push(entry);
            }
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text
                        >Footprints</kc-ui-panel-header-text
                    >
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <ul class="item-list">
                        <li class="header">Front</dt>
                        ${front_footprints}
                        <li class="header">Back</dt>
                        ${back_footprints}
                    </ul>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-board-footprints-panel",
    KCBoardFootprintsPanelElement,
);
