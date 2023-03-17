/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import common_styles from "./common-styles";

/**
 * kc-ui-floating-toolbar is a toolbar that presents its elements on top of
 * another, such as a document viewer. It allows tools to take up minimal room
 * in the UI since unused areas of the toolbar are transparent and open to the
 * element belong.
 */
export class KCUIFloatingToolbarElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                z-index: 10;
                user-select: none;
                pointer-events: none;
                position: absolute;
                left: 0;
                width: 100%;
                padding: 0.5rem;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: flex-start;
            }

            :host([location="top"]) {
                top: 0;
            }

            :host([location="bottom"]) {
                bottom: 0;
            }

            ::slotted(*) {
                user-select: initial;
                pointer-events: initial;
            }

            div.left {
                flex-grow: 999;
                display: flex;
            }

            div.right {
                display: flex;
            }
        `,
    ];

    override render() {
        return html` <div class="left">
                <slot name="left"></slot>
            </div>
            <div class="right">
                <slot name="right"></slot>
            </div>`;
    }
}

window.customElements.define(
    "kc-ui-floating-toolbar",
    KCUIFloatingToolbarElement,
);
