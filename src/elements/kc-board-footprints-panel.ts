/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../board/viewer";
import { html, CustomElement } from "../dom/custom-elements";
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
            const elm = html`<div>${fp.reference || "REF"}</div>
                <div>${fp.value || "VAL"}</div>`;
            if (fp.layer == "F.Cu") {
                front_footprints.push(elm);
            } else {
                back_footprints.push(elm);
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
                    <kc-ui-grid class="outline text-wrap-clip" columns="2">
                        <kc-ui-grid-title>Front</kc-ui-grid-title>
                        ${front_footprints}
                        <kc-ui-grid-title>Back</kc-ui-grid-title>
                        ${back_footprints}
                    </kc-ui-grid>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-board-footprints-panel",
    KCBoardFootprintsPanelElement,
);
