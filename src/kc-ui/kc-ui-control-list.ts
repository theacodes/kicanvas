/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import common_styles from "./common-styles";

export class KCUIControlListElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                flex-wrap: nowrap;
                background: var(--list-item-bg);
                color: var(--list-item-fg);
            }

            ul.control-list li {
                all: unset;
                box-sizing: border-box;
                margin-top: 0.2rem;
                display: flex;
                flex-direction: column;
                flex-wrap: nowrap;
                user-select: none;
                background-color: transparent;
                transition: color var(--transition-time-short) ease,
                    background-color var(--transition-time-short) ease;
            }

            ul.control-list li label {
                flex: 1 1 100%;
                display: block;
                margin: 0;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
            }

            ul.control-list li input {
                margin: 0;
                padding-left: 0;
                padding-right: 0;
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-control-list", KCUIControlListElement);

export class KCUIControlListItemElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                margin-top: 0.2rem;
                display: flex;
                flex-direction: column;
                flex-wrap: nowrap;
                user-select: none;
                background-color: transparent;
                transition: color var(--transition-time-short) ease,
                    background-color var(--transition-time-short) ease;
            }

            ::slotted(label) {
                flex: 1 1 100%;
                display: block;
                margin: 0;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
            }

            ::slotted(input) {
                margin: 0;
                padding-left: 0;
                padding-right: 0;
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define(
    "kc-ui-control-list-item",
    KCUIControlListItemElement,
);
