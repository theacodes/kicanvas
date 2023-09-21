/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-icon is a material symbol
 */
export class KCUIIconElement extends KCUIElement {
    public static sprites_url: string = "";

    static override styles = [
        css`
            :host {
                box-sizing: border-box;
                font-family: "Material Symbols Outlined";
                font-weight: normal;
                font-style: normal;
                font-size: inherit;
                line-height: 1;
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

            svg {
                width: 1.2em;
                height: auto;
                fill: currentColor;
            }
        `,
    ];

    override render() {
        const text = this.textContent ?? "";
        if (text.startsWith("svg:")) {
            const name = text.slice(4);
            const url = `${KCUIIconElement.sprites_url}#${name}`;
            return html`<svg viewBox="0 0 48 48" width="48">
                <use xlink:href="${url}" />
            </svg>`;
        } else {
            return html`<slot></slot>`;
        }
    }
}

window.customElements.define("kc-ui-icon", KCUIIconElement);
