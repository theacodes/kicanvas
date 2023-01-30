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
import "./kicanvas-dialog";

class KiCanvasAppElement extends HTMLElement {
    #view_elm: KiCanvasSchematicElement | KiCanvasBoardElement;

    constructor() {
        super();
    }

    async connectedCallback() {
        this.#renderShadowDOM();
        new DropTarget(this, ["kicad_sch", "kicad_pcb"], (files) => {
            this.load(files[0]);
        });
    }

    async load(src: File) {
        this.setAttribute("loading", "");

        this.shadowRoot.querySelector("main")?.remove();
        const main_elm = document.createElement("main");

        const extension = src.name.split(".").at(-1);

        switch (extension) {
            case "kicad_sch":
                main_elm.innerHTML =
                    "<kicanvas-schematic></kicanvas-schematic>";
                this.shadowRoot.appendChild(main_elm);
                this.#view_elm =
                    this.shadowRoot.querySelector("kicanvas-schematic");
                break;

            case "kicad_pcb":
                {
                    main_elm.innerHTML = `
                <div class="split-horizontal">
                    <div class="split-vertical">
                        <kicanvas-board></kicanvas-board>
                    </div>
                </div>`;

                    this.shadowRoot.appendChild(main_elm);
                    this.#view_elm =
                        this.shadowRoot.querySelector("kicanvas-board");

                    const layer_controls = document.createElement(
                        "kicanvas-layer-controls"
                    ) as KiCanvasLayerControlsElement;
                    layer_controls.target = this
                        .#view_elm as KiCanvasBoardElement;
                    this.#view_elm.after(layer_controls);

                    const info_bar = document.createElement(
                        "kicanvas-info-bar"
                    ) as KiCanvasInfoBarElement;
                    info_bar.target = this.#view_elm as KiCanvasBoardElement;
                    this.#view_elm.parentElement.after(info_bar);
                }
                break;
            default:
                throw new Error(`Unable to display file ${src.name}`);
        }

        await this.#view_elm.load(src);

        this.setAttribute("loaded", "");
        this.removeAttribute("loading");
    }

    #renderShadowDOM() {
        const template = document.createElement("template");
        template.innerHTML = `
            <style>
                *,
                *::before,
                *::after {
                    box-sizing: border-box;
                }

                * {
                    margin: 0;
                }

                :host {
                    box-sizing: border-box;
                    margin: 0;
                    display: flex;
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background-color: ${theme.schematic.background.to_css()};
                    color: ${theme.schematic.note.to_css()};
                }

                :host([loaded]) overlay, :host([loading]) overlay {
                    display: none;
                }

                kicanvas-schematic, kicanvas-board {
                    width: auto;
                    height: 100%;
                    flex: 1;
                }

                overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .split-horizontal {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    max-height: 100%;
                    overflow: hidden;
                }

                .split-vertical {
                    display: flex;
                    flex-direction: row;
                    width: 100%;
                    max-width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
            </style>

            <overlay>Drag & drop your kicad schematic or board file here.</overlay>
            <kicanvas-dialog></kicanvas-dialog>
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
    }
}

window.customElements.define("kicanvas-app", KiCanvasAppElement);
