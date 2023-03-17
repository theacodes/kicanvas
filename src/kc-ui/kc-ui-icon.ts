/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";

/**
 * kc-ui-icon is a material symbol
 */
export class KCUIIconElement extends CustomElement {
    static override styles = css`
        :host {
            box-sizing: border-box;
            font-family: "Material Symbols Outlined";
            font-weight: normal;
            font-style: normal;
            font-size: inherit;
            line-height: inherit;
            letter-spacing: normal;
            text-transform: none;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: "liga";
            -moz-font-feature-settings: "liga";
            font-feature-settings: "liga";
            -webkit-font-smoothing: antialiased;
            user-select: none;
        }
    `;

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-icon", KCUIIconElement);
