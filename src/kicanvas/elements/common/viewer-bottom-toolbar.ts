/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../../../base/web-components";
import { KCUIElement, type KCUIButtonElement } from "../../../kc-ui";
import {
    KiCanvasMouseMoveEvent,
    KiCanvasSelectEvent,
} from "../../../viewers/base/events";
import type { Viewer } from "../../../viewers/base/viewer";

export class KCViewerBottomToolbarElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            output {
                width: unset;
                margin: unset;
                padding: 0.5em;
                color: var(--button-toolbar-fg);
                background: var(--button-toolbar-bg);
                border: 1px solid var(--button-toolbar-bg);
                border-radius: 0.25em;
                font-weight: 300;
                font-size: 0.9em;
                box-shadow: var(--input-hover-shadow);
                user-select: none;
            }
        `,
    ];

    viewer: Viewer;
    #position_elm: HTMLOutputElement;
    #zoom_to_page_btn: KCUIButtonElement;
    #zoom_to_selection_btn: KCUIButtonElement;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;

            super.connectedCallback();

            this.addDisposable(
                this.viewer.addEventListener(
                    KiCanvasMouseMoveEvent.type,
                    () => {
                        this.update_position();
                    },
                ),
            );
            this.addDisposable(
                this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                    this.#zoom_to_selection_btn.disabled = e.detail.item
                        ? false
                        : true;
                }),
            );

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
            slot="left"
            class="toolbar"></output>` as HTMLOutputElement;

        this.#zoom_to_page_btn = html`<kc-ui-button
            slot="right"
            variant="toolbar"
            name="zoom_to_page"
            title="zoom to page"
            icon="svg:zoom_page">
        </kc-ui-button>` as KCUIButtonElement;

        this.#zoom_to_selection_btn = html` <kc-ui-button
            slot="right"
            variant="toolbar"
            name="zoom_to_selection"
            title="zoom to selection"
            icon="svg:zoom_footprint"
            disabled>
        </kc-ui-button>` as KCUIButtonElement;

        this.update_position();

        return html`<kc-ui-floating-toolbar location="bottom">
            ${this.#position_elm} ${this.#zoom_to_selection_btn}
            ${this.#zoom_to_page_btn}
        </kc-ui-floating-toolbar>`;
    }
}

window.customElements.define(
    "kc-viewer-bottom-toolbar",
    KCViewerBottomToolbarElement,
);
