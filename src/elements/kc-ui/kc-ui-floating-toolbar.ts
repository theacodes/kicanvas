/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../../dom/custom-elements";
import styles from "./kc-ui-floating-toolbar.css";

/**
 * kc-ui-floating-toolbar is a toolbar that presents its elements on top of
 * another, such as a document viewer. It allows tools to take up minimal room
 * in the UI since unused areas of the toolbar are transparent and open to the
 * element belong.
 */
export class KCUIFloatingToolbarElement extends CustomElement {
    static override styles = styles;

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
