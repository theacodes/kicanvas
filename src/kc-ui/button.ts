/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import { attribute, query } from "../base/dom/decorators";
import common_styles from "./common-styles";
import { KCUIIconElement } from "./icon";

/**
 * kc-ui-button wraps the <button> element with common styles and behaviors
 */
export class KCUIButtonElement extends CustomElement {
    static override styles = css`
        ${common_styles}

        :host {
            display: inline-block;
            position: relative;
            width: auto;
            cursor: pointer;
            user-select: none;
        }

        button {
            all: unset;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.5rem;
            border: 1px solid transparent;
            border-radius: 0.25rem;
            font-weight: medium;
            font-size: 1rem;
            background: var(--button-bg);
            color: var(--button-fg);
            transition: color var(--transition-time-short) ease,
                border var(--transition-time-short) ease,
                background var(--transition-time-short) ease;
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
    `;

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
        return html`<button>
            <kc-ui-icon>${this.icon}</kc-ui-icon><slot></slot>
        </button>`;
    }
}

window.customElements.define("kc-ui-button", KCUIButtonElement);
