/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../board/viewer";
import { html, CustomElement } from "../dom/custom-elements";
import { NeedsViewer } from "./kc-mixins";

export class KCBoardInfoPanelElement extends NeedsViewer(
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
        const ds = this.viewer.drawing_sheet;
        const board = this.viewer.board;

        const comments = Object.entries(board.title_block?.comment || {}).map(
            ([k, v]) =>
                html`<div>Comment ${k}</div>
                    <div>${v}</div>`,
        );

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Info</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <kc-ui-grid class="outline text-wrap-clip" columns="2">
                        <kc-ui-grid-title>Page properties</kc-ui-grid-title>
                        <div>Size</div>
                        <div>${ds.paper?.size}</div>
                        <div>Width</div>
                        <div>${ds.width} mm</div>
                        <div>Height</div>
                        <div>${ds.height} mm</div>
                        <kc-ui-grid-title>Board properties</kc-ui-grid-title>
                        <div>KiCAD version</div>
                        <div>${board.version}</div>
                        <div>Generator</div>
                        <div>${board.generator}</div>
                        <div>Thickness</div>
                        <div>${board.general?.thickness ?? 1.6} mm</div>
                        <div>Title</div>
                        <div>${board.title_block?.title}</div>
                        <div>Date</div>
                        <div>${board.title_block?.date}</div>
                        <div>Revision</div>
                        <div>${board.title_block?.rev}</div>
                        <div>Company</div>
                        <div>${board.title_block?.company}</div>
                        ${comments}
                        <div>Pad to mask clearance</div>
                        <div>${board.setup?.pad_to_mask_clearance ?? 0} mm</div>
                        <div>Soldermask min width</div>
                        <div>${board.setup?.solder_mask_min_width ?? 0} mm</div>
                        <div>Pad to paste clearance</div>
                        <div>
                            ${board.setup?.pad_to_paste_clearance ?? 0} mm
                        </div>
                        <div>Pad to paste clearance ratio</div>
                        <div>
                            ${board.setup?.pad_to_paste_clearance_ratio ?? 0}
                        </div>
                        <div>Grid origin</div>
                        <div>
                            ${board.setup?.grid_origin.x ?? 0},
                            ${board.setup?.grid_origin.y ?? 0}
                        </div>
                    </kc-ui-grid>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-board-info-panel", KCBoardInfoPanelElement);
