/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-panel and kc-ui-panel-body encompass basic
 * scrollable panels
 */

export class KCUIPanelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                width: 100%;
                height: 100%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                background: var(--panel-bg);
                color: var(--panel-fg);
                --bg: var(--panel-bg);
            }

            :host(:last-child) {
                flex-grow: 1;
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-panel", KCUIPanelElement);

export class KCUIPanelTitleElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                flex: 0;
                width: 100%;
                text-align: left;
                padding: 0.2em 0.8em 0.2em 0.4em;
                display: flex;
                align-items: center;
                background: var(--panel-title-bg);
                color: var(--panel-title-fg);
                border-top: var(--panel-title-border);
                user-select: none;
            }

            div.title {
                flex: 1;
            }

            div.actions {
                flex: 0 1;
                display: flex;
                flex-direction: row;
                /* cheeky hack to work around scrollbar causing placement to be off. */
                padding-right: 6px;
            }
        `,
    ];

    override render() {
        return html`<div class="title">${this.title}</div>
            <div class="actions">
                <slot name="actions"></slot>
            </div>`;
    }
}

window.customElements.define("kc-ui-panel-title", KCUIPanelTitleElement);

export class KCUIPanelBodyElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                width: 100%;
                min-height: 0;
                overflow-y: auto;
                overflow-x: hidden;
                flex: 1 0;
                font-weight: 300;
                font-size: 1em;
            }

            :host([padded]) {
                padding: 0.1em 0.8em 0.1em 0.4em;
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-panel-body", KCUIPanelBodyElement);

export class KCUIPanelLabelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                width: 100%;
                display: flex;
                flex-wrap: nowrap;
                padding: 0.2em 0.3em;
                background: var(--panel-subtitle-bg);
                color: var(--panel-subtitle-fg);
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-panel-label", KCUIPanelLabelElement);
