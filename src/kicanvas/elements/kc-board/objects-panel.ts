/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { delegate } from "../../../base/events";
import { html } from "../../../base/web-components";
import { KCUIElement, type KCUIRangeElement } from "../../../kc-ui";
import { BoardViewer } from "../../../viewers/board/viewer";

export class KCBoardObjectsPanelElement extends KCUIElement {
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
        delegate(this.renderRoot, "kc-ui-range", "kc-ui-range:input", (e) => {
            const control = e.target as KCUIRangeElement;
            const opacity = control.valueAsNumber;
            switch (control.name) {
                case "tracks":
                    this.viewer.track_opacity = opacity;
                    break;
                case "vias":
                    this.viewer.via_opacity = opacity;
                    break;
                case "pads":
                    this.viewer.pad_opacity = opacity;
                    break;
                case "holes":
                    this.viewer.pad_hole_opacity = opacity;
                    break;
                case "zones":
                    this.viewer.zone_opacity = opacity;
                    break;
                case "grid":
                    this.viewer.grid_opacity = opacity;
                    break;
                case "page":
                    this.viewer.page_opacity = opacity;
                    break;
            }
        });
    }

    override render() {
        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Objects"></kc-ui-panel-title>
                <kc-ui-panel-body padded>
                    <kc-ui-control-list>
                        <kc-ui-control>
                            <label>Tracks</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="tracks"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Vias</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="vias"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Pads</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="pads"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Through holes</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="holes"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Zones</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="zones"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Grid</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="grid"></kc-ui-range>
                        </kc-ui-control>
                        <kc-ui-control>
                            <label>Page</label>
                            <kc-ui-range
                                min="0"
                                max="1.0"
                                step="0.01"
                                value="1"
                                name="page"></kc-ui-range>
                        </kc-ui-control>
                    </kc-ui-control-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-board-objects-panel",
    KCBoardObjectsPanelElement,
);
