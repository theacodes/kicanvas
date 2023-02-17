/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../framework/elements";
import { SchematicSymbol } from "../kicad/schematic";
import * as events from "../framework/events";
import styles from "./kicanvas-dialog.css";

export class KiCanvasDialogElement extends CustomElement {
    static override styles = styles;
    #selected: SchematicSymbol;

    constructor() {
        super();
    }

    override async connectedCallback() {
        await super.connectedCallback();

        window.addEventListener(
            events.names.viewer.inspect,
            async (e: Event) => {
                this.#selected = (e as CustomEvent).detail;
                await this.update();
                this.shadowRoot?.querySelector("dialog")?.showModal();
            },
        );
    }

    override async render() {
        if (!this.#selected) {
            return html``;
        }

        const properties = [];

        for (const prop of this.#selected.properties) {
            properties.push(html`<div class="property">
                <label for="${prop.name}">${prop.name}</label>
                <input
                    type="text"
                    readonly
                    id="${prop.name}"
                    name="${prop.name}"
                    value="${prop.text}"
                />
            </div>`);
        }

        return html`<dialog>
            <form method="dialog">
                <div class="properties">${properties}</div>
                <button>Close</button>
            </form>
        </dialog>`;
    }
}

window.customElements.define("kicanvas-dialog", KiCanvasDialogElement);
