/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DropTarget } from "../framework/drag-drop";
import * as theme from "../kicad/theme";
import { KiCanvasSchematicElement } from "./kicanvas-schematic";
import { KiCanvasBoardElement } from "./kicanvas-board";

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

        if (this.#view_elm) {
            this.#view_elm.remove();
        }

        const extension = src.name.split(".").at(-1);
        let element_name;

        switch (extension) {
            case "kicad_sch":
                element_name = "kicanvas-schematic";
                break;
            case "kicad_pcb":
                element_name = "kicanvas-board";
                break;
            default:
                throw new Error(`Unable to display file ${src.name}`);
        }

        this.#view_elm = document.createElement(element_name);

        this.shadowRoot.appendChild(this.#view_elm);

        await this.#view_elm.load(src);

        this.setAttribute("loaded", "");
        this.removeAttribute("loading");
    }

    #renderShadowDOM() {
        const template = document.createElement("template");
        template.innerHTML = `
            <style>
                :host {
                    display: block;
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
                    width: 100%;
                    height: 100%;
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
