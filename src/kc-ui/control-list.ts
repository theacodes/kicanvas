/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

export class KCUIControlListElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                flex-wrap: nowrap;
                background: var(--list-item-bg);
                color: var(--list-item-fg);
                padding-top: 0.2em;
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-control-list", KCUIControlListElement);

export class KCUIControlListItemElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                margin-top: 0.2em;
                display: flex;
                flex-direction: column;
                flex-wrap: nowrap;
                user-select: none;
                background-color: transparent;
                transition:
                    color var(--transition-time-short) ease,
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

            ::slotted(input),
            ::slotted(select) {
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
