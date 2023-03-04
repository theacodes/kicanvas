/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../board/viewer";
import { WithContext } from "../dom/context";
import { html, CustomElement } from "../dom/custom-elements";
import { KiCanvasSelectEvent } from "../framework/events";

export class KCBoardFootprintsPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: BoardViewer;

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

            this.viewer.select(uuid);
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
