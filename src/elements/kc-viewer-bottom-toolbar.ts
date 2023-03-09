/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { WithContext } from "../dom/context";
import { CustomElement, html } from "../dom/custom-elements";
import { KiCanvasSelectEvent } from "../framework/events";
import type { Viewer } from "../framework/viewer";

import "./kc-ui/kc-ui";
import "./kc-ui/kc-ui-floating-toolbar";

export class KCViewerBottomToolbarElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: Viewer;
    #position_elm: HTMLOutputElement;
    #zoom_to_page_btn: HTMLButtonElement;
    #zoom_to_selection_btn: HTMLButtonElement;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;

            super.connectedCallback();

            this.viewer.canvas.addEventListener("mousemove", () => {
                this.update_position();
            });

            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                this.#zoom_to_selection_btn.disabled = e.detail.item
                    ? false
                    : true;
            });

            this.#zoom_to_page_btn.addEventListener("click", (e) => {
                e.preventDefault();
                this.viewer.zoom_to_page();
            });
            this.#zoom_to_selection_btn.addEventListener("click", (e) => {
                e.preventDefault();
                this.viewer.zoom_to_selection();
            });
        })();
    }

    private update_position() {
        const pos = this.viewer.mouse_position;
        this.#position_elm.value = `${pos.x.toFixed(2)}, ${pos.y.toFixed(
            2,
        )} mm`;
    }

    override render() {
        this.#position_elm = html`<output
            class="toolbar"></output>` as HTMLOutputElement;

        this.#zoom_to_page_btn = html`<button
            name="zoom_to_page"
            type="button"
            class="toolbar"
            title="zoom to page">
            <kc-ui-icon>document_scanner</kc-ui-icon>
        </button>` as HTMLButtonElement;

        this.#zoom_to_selection_btn = html` <button
            name="zoom_to_selection"
            type="button"
            class="toolbar"
            title="zoom to selection"
            disabled>
            <kc-ui-icon>jump_to_element</kc-ui-icon>
        </button>` as HTMLButtonElement;

        this.update_position();

        return html` <kc-ui-floating-toolbar location="bottom">
            <div slot="left">${this.#position_elm}</div>
            <div slot="right" class="button-group margin-left">
                ${this.#zoom_to_selection_btn} ${this.#zoom_to_page_btn}
            </div>
        </kc-ui-floating-toolbar>`;
    }
}

window.customElements.define(
    "kc-viewer-bottom-toolbar",
    KCViewerBottomToolbarElement,
);
