/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, CustomElement } from "../dom/custom-elements";
import { KiCanvasBoardElement } from "./kicanvas-board";
import { KiCanvasLayerControlsElement } from "./kicanvas-layer-controls";

/**
 * Internal custom element for <kicanvas-app>'s board viewer. Handles setting
 * up the actual board viewer as well as interface controls. It's basically
 * KiCanvas's version of PCBNew.
 */
export class KCBoardViewerElement extends CustomElement {
    static override useShadowRoot = false;

    board_elm: KiCanvasBoardElement;

    get loaded() {
        return this.board_elm?.loaded;
    }

    override initialContentCallback() {}

    override disconnectedCallback() {}

    async load(src: File | string) {
        this.board_elm.load(src);
    }

    override render() {
        this.board_elm =
            html`<kicanvas-board></kicanvas-board>` as KiCanvasBoardElement;

        const layer_controls_elem =
            html`<kicanvas-layer-controls></kicanvas-layer-controls>` as KiCanvasLayerControlsElement;
        layer_controls_elem.target = this.board_elm;

        return html` <kc-ui-split-view vertical>
            <kc-ui-view class="grow"> ${this.board_elm} </kc-ui-view>
            <kc-ui-view>
                <kc-ui-activity-bar group="inspect">
                    <kc-ui-activity-bar-start>
                        <button
                            tooltip-left="Layers"
                            name="layers"
                            aria-selected="true">
                            <kc-ui-icon>layers</kc-ui-icon>
                        </button>
                        <button tooltip-left="Objects" name="objects">
                            <kc-ui-icon>category</kc-ui-icon>
                        </button>
                        <button tooltip-left="Footprints" name="footprints">
                            <kc-ui-icon>footprint</kc-ui-icon>
                        </button>
                        <button tooltip-left="Nets" name="nets">
                            <kc-ui-icon>hub</kc-ui-icon>
                        </button>
                        <button tooltip-left="Properties" name="properties">
                            <kc-ui-icon>list</kc-ui-icon>
                        </button>
                        <button tooltip-left="Info" name="info">
                            <kc-ui-icon>info</kc-ui-icon>
                        </button>
                    </kc-ui-activity-bar-start>
                    <kc-ui-activity-bar-end>
                        <button tooltip-left="Help">
                            <kc-ui-icon>help</kc-ui-icon>
                        </button>
                    </kc-ui-activity-bar-end>
                </kc-ui-activity-bar>
            </kc-ui-view>
            <kc-ui-view class="min-width-15">
                <kc-ui-activity group="inspect" name="layers" active>
                    ${layer_controls_elem}
                </kc-ui-activity>
                <kc-ui-activity group="inspect" name="objects">
                    <kc-ui-panel>
                        <kc-ui-panel-header>
                            <kc-ui-panel-header-text>
                                Objects
                            </kc-ui-panel-header-text>
                        </kc-ui-panel-header>
                    </kc-ui-panel>
                </kc-ui-activity>
                <kc-ui-activity group="inspect" name="footprints">
                    <kc-ui-panel>
                        <kc-ui-panel-header>
                            <kc-ui-panel-header-text>
                                Footprints
                            </kc-ui-panel-header-text>
                        </kc-ui-panel-header>
                    </kc-ui-panel>
                </kc-ui-activity>
                <kc-ui-activity group="inspect" name="nets">
                    <kc-ui-panel>
                        <kc-ui-panel-header>
                            <kc-ui-panel-header-text>
                                Nets
                            </kc-ui-panel-header-text>
                        </kc-ui-panel-header>
                    </kc-ui-panel>
                </kc-ui-activity>
                <kc-ui-activity group="inspect" name="properties">
                    <kc-ui-panel>
                        <kc-ui-panel-header>
                            <kc-ui-panel-header-text>
                                Properties
                            </kc-ui-panel-header-text>
                        </kc-ui-panel-header>
                    </kc-ui-panel>
                </kc-ui-activity>
                <kc-ui-activity group="inspect" name="info">
                    <kc-ui-panel>
                        <kc-ui-panel-header>
                            <kc-ui-panel-header-text>
                                Info
                            </kc-ui-panel-header-text>
                        </kc-ui-panel-header>
                    </kc-ui-panel>
                </kc-ui-activity>
            </kc-ui-view>
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-board-viewer", KCBoardViewerElement);
