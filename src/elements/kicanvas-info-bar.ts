/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../dom/custom-elements";
import { Footprint } from "../kicad/board";
import { KiCanvasBoardElement } from "./kicanvas-board";
import * as events from "../framework/events";
import styles from "./kicanvas-info-bar.css";

export class KiCanvasInfoBarElement extends CustomElement {
    static override styles = styles;

    #footprint: Footprint;
    target: KiCanvasBoardElement;

    constructor() {
        super();
    }

    override async connectedCallback() {
        if (!this.target) {
            const target_id = this.getAttribute("for");
            if (target_id) {
                this.target = document.getElementById(
                    target_id,
                ) as KiCanvasBoardElement;
            }
        }

        if (!this.target) {
            throw new Error("No target for <kicanvas-info-bar>");
        }

        await super.connectedCallback();

        this.target.addEventListener(events.names.viewer.select, (e: Event) => {
            this.#onItemSelected(
                e.target as HTMLElement,
                (e as CustomEvent).detail,
            );
        });
    }

    override async disconnectedCallback() {
        this.target = undefined!;
    }

    #onItemSelected(element: HTMLElement, detail: Footprint) {
        console.log("Selected", detail);
        this.#footprint = detail;
        this.update();
    }

    override async render() {
        if (!this.#footprint) {
            return html`<ul>
                <li>Nothing selected</li>
            </ul>`;
        }

        return html`<ul>
            <li>${this.#footprint.reference}</li>
            <li>${this.#footprint.value}</li>
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
