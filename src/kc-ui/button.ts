/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, css, html, query } from "../base/web-components";
import { KCUIElement } from "./element";
import { KCUIIconElement } from "./icon";

/**
 * kc-ui-button wraps the <button> element with common styles and behaviors
 */
export class KCUIButtonElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: inline-flex;
                position: relative;
                width: auto;
                cursor: pointer;
                user-select: none;
                align-items: center;
                justify-content: center;
            }

            button {
                all: unset;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.5em;
                border: 1px solid transparent;
                border-radius: 0.25em;
                font-weight: medium;
                font-size: 1em;
                background: var(--button-bg);
                color: var(--button-fg);
                transition:
                    color var(--transition-time-short) ease,
                    border var(--transition-time-short) ease,
                    background var(--transition-time-short) ease;
            }

            :host {
                fill: var(--button-fg);
            }

            button:hover {
                background: var(--button-hover-bg);
                color: var(--button-hover-fg);
            }

            button:disabled {
                background: var(--button-disabled-bg);
                color: var(--button-disabled-fg);
            }

            button:focus {
                outline: var(--button-focus-outline);
            }

            :host([selected]) button {
                background: var(--button-selected-bg);
                color: var(--button-selected-fg);
            }

            /* variants */

            button.outline {
                background: var(--button-outline-bg);
                color: var(--button-outline-fg);
            }

            button.outline:hover {
                background: var(--button-outline-hover-bg);
                color: var(--button-outline-hover-fg);
            }

            button.outline:disabled {
                background: var(--button-outline-disabled-bg);
                color: var(--button-outline-disabled-fg);
            }

            :host([selected]) button.outline {
                background: var(--button-outline-disabled-bg);
                color: var(--button--outline-disabled-fg);
            }

            button.toolbar {
                background: var(--button-toolbar-bg);
                color: var(--button-toolbar-fg);
            }

            button.toolbar:hover {
                background: var(--button-toolbar-hover-bg);
                color: var(--button-toolbar-hover-fg);
            }

            button.toolbar:disabled {
                background: var(--button-toolbar-disabled-bg);
                color: var(--button-toolbar-disabled-fg);
            }

            :host([selected]) button.toolbar {
                background: var(--button-toolbar-disabled-bg);
                color: var(--button--toolbar-disabled-fg);
            }

            button.toolbar-alt {
                background: var(--button-toolbar-alt-bg);
                color: var(--button-toolbar-alt-fg);
            }

            button.toolbar-alt:hover {
                background: var(--button-toolbar-alt-hover-bg);
                color: var(--button-toolbar-alt-hover-fg);
            }

            button.toolbar-alt:disabled {
                background: var(--button-toolbar-alt-disabled-bg);
                color: var(--button-toolbar-alt-disabled-fg);
            }

            :host([selected]) button.toolbar-alt {
                background: var(--button-toolbar-alt-disabled-bg);
                color: var(--button--toolbar-alt-disabled-fg);
            }

            button.menu {
                background: var(--button-menu-bg);
                color: var(--button-menu-fg);
                padding: 0;
            }

            button.menu:hover {
                background: var(--button-menu-hover-bg);
                color: var(--button-menu-hover-fg);
                outline: none;
            }

            button.menu:focus {
                outline: none;
            }

            button.menu:disabled {
                background: var(--button-menu-disabled-bg);
                color: var(--button-menu-disabled-fg);
            }

            :host([selected]) button.menu {
                background: var(--button-menu-disabled-bg);
                color: var(--button--menu-disabled-fg);
                outline: none;
            }
        `,
    ];

    @query("button", true)
    private button!: HTMLButtonElement;

    @query("button_icon", true)
    private button_icon!: KCUIIconElement;

    @attribute({ type: String })
    name: string | null;

    @attribute({ type: String })
    icon: string | null;

    @attribute({ type: String })
    variant: string | null;

    @attribute({ type: Boolean })
    disabled: boolean;

    @attribute({ type: Boolean })
    selected: boolean;

    static get observedAttributes() {
        return ["disabled", "icon"];
    }

    attributeChangedCallback(
        name: string,
        old: string | null,
        value: string | null,
    ) {
        if (!this.button) {
            return;
        }
        switch (name) {
            case "disabled":
                this.button.disabled = value == null ? false : true;
                break;
            case "icon":
                this.button_icon.innerText = value ?? "";
                break;
        }
    }

    override initialContentCallback() {
        if (this.variant) {
            this.button.classList.add(this.variant);
        }

        this.button.disabled = this.disabled;
    }

    override render() {
        const icon = this.icon
            ? html`<kc-ui-icon part="icon">${this.icon}</kc-ui-icon>`
            : undefined;
        return html`<button part="base">
            ${icon}
            <slot part="contents"></slot>
        </button>`;
    }
}

window.customElements.define("kc-ui-button", KCUIButtonElement);
