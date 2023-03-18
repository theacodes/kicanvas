/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import { BoardViewer } from "../../../viewers/board/viewer";

export class KCBoardInfoPanelElement extends KCUIElement {
    viewer: BoardViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
        })();
    }

    override render() {
        const ds = this.viewer.drawing_sheet;
        const board = this.viewer.board;
        const board_bbox = board.edge_cuts_bbox;

        const header = (name: string) =>
            html`<kc-ui-property-list-item
                name="${name}"
                class="label"></kc-ui-property-list-item>`;

        const entry = (name: string, desc?: any, suffix = "") =>
            html` <kc-ui-property-list-item name="${name}">
                ${desc} ${suffix}
            </kc-ui-property-list-item>`;

        const comments = Object.entries(board.title_block?.comment || {}).map(
            ([k, v]) => entry(`Comment ${k}`, v),
        );

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Info"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <kc-ui-property-list>
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
                            `${board.setup?.grid_origin?.x ?? 0}, ${
                                board.setup?.grid_origin?.y ?? 0
                            }`,
                        )}
                    </kc-ui-property-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-board-info-panel", KCBoardInfoPanelElement);
