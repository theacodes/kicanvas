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

class KiCanvasAppElement extends HTMLElement {
    #view_elm: KiCanvasSchematicElement | KiCanvasBoardElement;
    #controls_elm: KiCanvasLayerControlsElement;

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

        if (this.#view_elm) {
            this.#view_elm.remove();
        }
        if (this.#controls_elm) {
            this.#controls_elm.remove();
        }

        const extension = src.name.split(".").at(-1);

        switch (extension) {
            case "kicad_sch":
                this.#view_elm = document.createElement(
                    "kicanvas-schematic"
                ) as KiCanvasSchematicElement;
                this.shadowRoot.appendChild(this.#view_elm);
                break;
            case "kicad_pcb":
                this.#view_elm = document.createElement(
                    "kicanvas-board"
                ) as KiCanvasBoardElement;
                this.shadowRoot.appendChild(this.#view_elm);
                this.#controls_elm = document.createElement(
                    "kicanvas-layer-controls"
                ) as KiCanvasLayerControlsElement;
                this.#controls_elm.target = this.#view_elm;
                this.shadowRoot.appendChild(this.#controls_elm);
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
            </style>
            <overlay>Drag & drop your kicad schematic or board file here.</overlay>
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
    }
}

window.customElements.define("kicanvas-app", KiCanvasAppElement);
