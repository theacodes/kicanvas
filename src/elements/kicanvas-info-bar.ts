/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { KiCanvasBoardElement } from "./kicanvas-board";

export class KiCanvasInfoBarElement extends HTMLElement {
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

        if (this.target.loaded) {
            this.#renderShadowDOM();
        } else {
            this.target.addEventListener("kicanvas:loaded", () => {
                this.#renderShadowDOM();
            });
            this.target.addEventListener(
                "kicad-board:item-selected",
                (e: CustomEvent) => {
                    this.#onItemSelected(e.target, e.detail);
                }
            );
        }
    }

    disconnectedCallback() {
        this.target = null;
    }

    #onItemSelected(element, detail) {
        this.#renderProperties(detail);
    }

    #renderProperties(fp) {
        console.log(fp);
        this.shadowRoot.querySelector("ul")?.remove();

        const list_elem = document.createElement("ul");

        list_elem.innerHTML = `
        <li>${fp.properties.reference}</li>
        <li>${fp.properties.value}</li>
        <li>${fp.library_link}</li>
        <li>X: ${fp.at.position.x.toFixed(3)}, Y: ${fp.at.position.y.toFixed(
            3
        )}</li>
        <li>${fp.attr.map((e) => e.replaceAll("_", " ")).join(", ")}</li>
        <li>${fp.descr ?? ""}</li>
        `;

        this.shadowRoot.appendChild(list_elem);
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
                    flex-shrink: 0;
                    background-color: #222;
                    padding: 0.5rem 0rem;
                    color: white;
                    font-family: inherit;
                }

                ul {
                    list-style-type: none;
                    display: flex;
                    flex-direction: column;
                    flex-wrap: wrap;
                    height: 3.4em;
                    padding: 0.25rem 1rem;
                    max-width: fit-content;
                }

                li {
                    display: block;
                    margin-right: 2rem;
                    max-width: 33vw;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>
            <ul></ul>
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
    }
}

window.customElements.define("kicanvas-info-bar", KiCanvasInfoBarElement);
