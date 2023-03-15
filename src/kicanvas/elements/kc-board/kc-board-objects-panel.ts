/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../../../viewers/board/viewer";
import { WithContext } from "../../../base/dom/context";
import { html, CustomElement } from "../../../base/dom/custom-element";

export class KCBoardObjectsPanelElement extends WithContext(CustomElement) {
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

    private get controls() {
        return this.$$<HTMLInputElement>("input");
    }

    private setup_events() {
        for (const control of this.controls) {
            control.addEventListener("input", (e) => {
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
                    default:
                        console.log(control.name, opacity);
                }
            });
        }
    }

    override render() {
        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Objects</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body>
                    <ul class="control-list">
                        <li>
                            <label>Tracks</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="tracks"></input>
                        </li>
                        <li>
                            <label>Vias</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="vias"></input>
                        </li>
                        <li>
                            <label>Pads</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="pads"></input>
                        </li>
                        <li>
                            <label>Through holes</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="holes"></input>
                        </li>
                        <li>
                            <label>Zones</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="zones"></input>
                        </li>
                        <li>
                            <label>Grid</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="grid"></input>
                        </li>
                        <li>
                            <label>Page</label>
                            <input type="range" min="0" max="1.0" step="0.01" value="1" name="page"></input>
                        </li>
                    </ul>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define(
    "kc-board-objects-panel",
    KCBoardObjectsPanelElement,
);
