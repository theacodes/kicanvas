/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html, literal } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-icon is a material symbol
 */
export class KCUIIconElement extends KCUIElement {
    private static svg_icons = new Map<string, ReturnType<typeof literal>>();

    public static add_svg_icon(name: string, src: string) {
        this.svg_icons.set(name, literal`${src}`);
    }

    static override styles = [
        css`
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
            const icon = KCUIIconElement.svg_icons.get(name) ?? "";
            return html`${icon}`;
        } else {
            return html`<slot></slot>`;
        }
    }
}

window.customElements.define("kc-ui-icon", KCUIIconElement);
