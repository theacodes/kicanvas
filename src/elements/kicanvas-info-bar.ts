/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../framework/elements";
import { Footprint } from "../kicad/board";
import { KiCanvasBoardElement } from "./kicanvas-board";
import styles from "./kicanvas-info-bar.css";

export class KiCanvasInfoBarElement extends CustomElement {
    static styles = styles;

    #footprint: Footprint;
    target: KiCanvasBoardElement;

    constructor() {
        super();
    }

    async connectedCallback() {
        if (!this.target) {
            const target_id = this.getAttribute("for");
            this.target = document.getElementById(
                target_id
            ) as KiCanvasBoardElement;
        }

        if (!this.target) {
            throw new Error("No target for <kicanvas-info-bar>");
        }

        super.connectedCallback();

        this.target.addEventListener(
            "kicad-board:item-selected",
            (e: CustomEvent) => {
                this.#onItemSelected(e.target, e.detail);
            }
        );
    }

    disconnectedCallback() {
        this.target = null;
    }

    #onItemSelected(element, detail) {
        console.log("Selected", detail);
        this.#footprint = detail as Footprint;
        this.update();
    }

    async render() {
        if (!this.#footprint) {
            return html`<ul>
                <li>Nothing selected</li>
            </ul>`;
        }

        return html`<ul>
            <li>${this.#footprint.properties.reference}</li>
            <li>${this.#footprint.properties.value}</li>
            <li>${this.#footprint.library_link}</li>
            <li>
                X: ${this.#footprint.at.position.x.toFixed(3)}, Y:
                ${this.#footprint.at.position.y.toFixed(3)}
            </li>
            <li>
                ${this.#footprint.attr
                    .map((e) => e.replaceAll("_", " "))
                    .join(", ")}
            </li>
            <li>${this.#footprint.descr ?? ""}</li>
        </ul>`;
    }
}

window.customElements.define("kicanvas-info-bar", KiCanvasInfoBarElement);
