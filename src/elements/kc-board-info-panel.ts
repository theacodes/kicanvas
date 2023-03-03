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
        const board_bbox = board.edge_cuts_bbox;

        const header = (name: string) => `<dt class="header">${name}</dt>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            `<dt>${name}</dt><dd>${desc} ${suffix}</dd>`;

        const comments = Object.entries(board.title_block?.comment || {}).map(
            ([k, v]) => entry(`<d>Comment ${k}`, v),
        );

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Info</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <dl class="property-list">
                        ${header("Page properties")}
                        ${entry("Size", ds.paper?.size)}
                        ${entry("Width", ds.width, "mm")}
                        ${entry("Height", ds.height, "mm")}
                        ${header("Board properties")}
                        ${entry("KiCAD version", board.version)}
                        ${entry("Generator", board.generator)}
                        ${entry(
                            "Thickness",
                            board.general?.thickness ?? 1.6,
                            "mm",
                        )}
                        ${entry("Title", board.title_block?.title)}
                        ${entry("Date", board.title_block?.date)}
                        ${entry("Revision", board.title_block?.rev)}
                        ${entry("Company", board.title_block?.company)}
                        ${comments}
                        ${entry(
                            "Dimensions",
                            `${board_bbox.w.toFixed(1)} x
                            ${board_bbox.h.toFixed(1)} mm`,
                        )}
                        </div>
                        ${entry("Footprints", board.footprints.length)}
                        ${entry("Nets", board.nets.length)}
                        ${entry("Track segments", board.segments.length)}
                        ${entry("Vias", board.vias.length)}
                        ${entry("Zones", board.zones.length)}
                        ${entry(
                            "Pad to mask clearance",
                            board.setup?.pad_to_mask_clearance ?? 0,
                            "mm",
                        )}
                        ${entry(
                            "Soldermask min width",
                            board.setup?.solder_mask_min_width ?? 0,
                            "mm",
                        )}
                        ${entry(
                            "Pad to paste clearance",
                            board.setup?.pad_to_paste_clearance ?? 0,
                            "mm",
                        )}
                        ${entry(
                            "Pad to paste clearance ratio",
                            board.setup?.pad_to_paste_clearance_ratio ?? 0,
                        )}
                        ${entry(
                            "Grid origin",
                            `${board.setup?.grid_origin.x ?? 0}, ${
                                board.setup?.grid_origin.y ?? 0
                            }`,
                        )}
                    </dl>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-board-info-panel", KCBoardInfoPanelElement);
