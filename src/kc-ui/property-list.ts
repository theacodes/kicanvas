/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html, attribute } from "../base/web-components";
import { KCUIElement } from "./element";

export class KCUIPropertyList extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
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

export class KCUIPropertyListItemElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: contents;
            }

            span {
                padding: 0.2em;
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

            ::slotted(*) {
                vertical-align: middle;
            }
        `,
    ];

    @attribute({ type: String })
    name: string;

    override render() {
        return html`<span title="${this.name}">${this.name}</span
            ><span><slot></slot></span>`;
    }
}

window.customElements.define(
    "kc-ui-property-list-item",
    KCUIPropertyListItemElement,
);
