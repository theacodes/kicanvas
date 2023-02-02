/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DropTarget } from "../framework/drag-drop";
import * as theme from "../kicad/theme";
import { KiCanvasSchematicElement } from "./kicanvas-schematic";
import { KiCanvasBoardElement } from "./kicanvas-board";
import { KiCanvasLayerControlsElement } from "./kicanvas-layer-controls";
import { KiCanvasInfoBarElement } from "./kicanvas-info-bar";
import { CustomElement, html } from "../framework/elements";
import styles from "./kicanvas-app.css";

class KiCanvasAppElement extends CustomElement {
    static override styles = styles;

    constructor() {
        super();
    }

    override async connectedCallback() {
        super.connectedCallback();

        new DropTarget(this, ["kicad_sch", "kicad_pcb"], (files) => {
            this.load(files[0]);
        });
    }

    async load(src: File) {
        this.setAttribute("loading", "");

        this.shadowRoot!.querySelector("main")?.remove();

        const extension = src.name.split(".").at(-1);

        let view_elem: KiCanvasSchematicElement | KiCanvasBoardElement;
        let content;

        switch (extension) {
            case "kicad_sch":
                view_elem =
                    html`<kicanvas-schematic></kicanvas-schematic>` as KiCanvasSchematicElement;
                content = html`<main>${view_elem}</main>`;
                break;

            case "kicad_pcb":
                {
                    view_elem =
                        html`<kicanvas-board></kicanvas-board>` as KiCanvasBoardElement;

                    const layer_controls_elem =
                        html`<kicanvas-layer-controls></kicanvas-layer-controls>` as KiCanvasLayerControlsElement;
                    layer_controls_elem.target = view_elem;

                    const info_bar_elem =
                        html`<kicanvas-info-bar></kicanvas-info-bar>` as KiCanvasInfoBarElement;
                    info_bar_elem.target = view_elem;

                    content = html`<main>
                        <div class="split-horizontal">
                            <div class="split-vertical">
                                ${view_elem} ${layer_controls_elem}
                            </div>
                            ${info_bar_elem}
                        </div>
                    </main>`;
                }
                break;
            default:
                throw new Error(`Unable to display file ${src.name}`);
        }

        this.shadowRoot!.appendChild(content);

        await view_elem.load(src);

        this.setAttribute("loaded", "");
        this.removeAttribute("loading");
    }

    override async render() {
        this.style.backgroundColor = theme.schematic.background.to_css();
        this.style.color = theme.schematic.note.to_css();

        return html`
            <overlay
                >Drag & drop your kicad schematic or board file here.</overlay
            >
            <kicanvas-dialog></kicanvas-dialog>
        `;
    }
}

window.customElements.define("kicanvas-app", KiCanvasAppElement);
