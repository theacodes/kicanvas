/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import common_styles from "./common-styles";
import { KCUIIconElement } from "./kc-ui-icon";

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

    private get button() {
        return this.$<HTMLButtonElement>("button")!;
    }

    private get button_icon() {
        return this.$<KCUIIconElement>("kc-ui-icon")!;
    }

    public get name() {
        return this.getAttribute("name");
    }

    public set name(val) {
        if (val) {
            this.setAttribute("name", val);
        } else {
            this.removeAttribute("name");
        }
    }

    public set disabled(val: boolean) {
        this.setBooleanAttribute("disabled", val);
    }

    public get disabled() {
        return this.getBooleanAttribute("disabled");
    }

    public set selected(val: boolean) {
        this.setBooleanAttribute("selected", val);
    }

    public get selected() {
        return this.getBooleanAttribute("selected");
    }

    public get icon() {
        return this.getAttribute("icon");
    }

    public set icon(val) {
        if (val) {
            this.setAttribute("icon", val);
        } else {
            this.removeAttribute("icon");
        }
    }

    static get observedAttributes() {
        return ["disabled"];
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
        if (this.hasAttribute("variant")) {
            this.button.classList.add(this.getAttribute("variant") ?? "");
        }

        if (this.hasAttribute("disabled")) {
            this.attributeChangedCallback(
                "disabled",
                null,
                this.getAttribute("disabled"),
            );
        }
    }

    override render() {
        return html`<button>
            <kc-ui-icon>${this.icon}</kc-ui-icon><slot></slot>
        </button>`;
    }
}

window.customElements.define("kc-ui-button", KCUIButtonElement);
