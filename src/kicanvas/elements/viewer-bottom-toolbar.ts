/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../../base/web-components";
import { zoom_footprint, zoom_page } from "../../icons";
import { KCUIElement, type KCUIButtonElement } from "../../kc-ui";
import {
    KiCanvasMouseMoveEvent,
    KiCanvasSelectEvent,
} from "../../viewers/base/events";
import type { Viewer } from "../../viewers/base/viewer";

export class KCViewerBottomToolbarElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            output {
                width: unset;
                margin: unset;
                padding: 0.5rem;
                color: var(--button-toolbar-fg);
                background: var(--button-toolbar-bg);
                border: 1px solid var(--button-toolbar-bg);
                border-radius: 0.25rem;
                font-weight: 300;
                font-size: 0.9rem;
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
            class="toolbar"></output>` as HTMLOutputElement;

        this.#zoom_to_page_btn = html`<kc-ui-button
            variant="toolbar"
            name="zoom_to_page"
            title="zoom to page">
            ${zoom_page}
        </kc-ui-button>` as KCUIButtonElement;

        this.#zoom_to_selection_btn = html` <kc-ui-button
            variant="toolbar"
            name="zoom_to_selection"
            title="zoom to selection"
            disabled>
            ${zoom_footprint}
        </kc-ui-button>` as KCUIButtonElement;

        this.update_position();

        return html`<kc-ui-floating-toolbar location="bottom">
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
