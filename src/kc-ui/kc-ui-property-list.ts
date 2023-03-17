/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import common_styles from "./common-styles";

export class KCUIPropertyList extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                display: grid;
                gap: 1px;
                grid-template-columns: fit-content(50%) 1fr;
                background: var(--grid-outline);
                border-bottom: 1px solid var(--grid-outline);
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-property-list", KCUIPropertyList);

export class KCUIPropertyListItemElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                display: contents;
            }

            span {
                padding: 0.2rem;
                background: var(--bg);
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                user-select: all;
            }

            :host(.label) span:first-child {
                user-select: none;
                grid-column-end: span 2;
                background: var(--panel-subtitle-bg);
                color: var(--panel-subtitle-fg);
            }

            :host(.label) span:last-child {
                display: none;
            }
        `,
    ];

    override render() {
        const name = this.getAttribute("name");
        return html`<span>${name}</span><span><slot></slot></span>`;
    }
}

window.customElements.define(
    "kc-ui-property-list-item",
    KCUIPropertyListItemElement,
);
