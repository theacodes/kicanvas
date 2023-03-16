/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, CustomElement } from "../base/dom/custom-element";
import { KCUIDropdownElement } from "./kc-ui-dropdown";
import { css } from "../base/dom/css";

/**
 * A toggle menu combines a button and a dropdown into a single element.
 *
 * This element holds a button and a kc-ui-dropdown, the button is used to
 * toggle the dropdown.
 */
export class KCUIToggleMenuElement extends CustomElement {
    static override styles = css`
        * {
            box-sizing: border-box;
        }

        button {
            all: unset;
            box-sizing: border-box;
            user-select: none;
            width: 100%;
            max-width: 100%;
            margin: unset;
            font: inherit;
            padding: 0.3rem 0.6rem 0.3rem 0.6rem;
            display: flex;
            align-items: flex-end;
            justify-content: left;
            border: 1px solid transparent;
            border-radius: 0.25rem;
            font-weight: 300;
            font-size: 1rem;
            background: var(--dropdown-bg);
            color: var(--dropdown-fg);
            transition: color var(--transition-time-medium, 500) ease,
                background var(--transition-time-medium, 500) ease;
        }

        button:hover,
        button:focus {
            background: var(--dropdown-hover-bg);
            color: var(--dropdown-hover-fg);
            box-shadow: none;
            outline: none;
        }

        button kc-ui-icon {
            font-size: 1rem;
            margin-top: 0.1rem;
            margin-bottom: 0.1rem;
        }

        button span {
            display: none;
            margin-left: 0.5rem;
        }

        :host([open]) button {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }

        :host([open]) button span {
            display: revert;
        }

        ::slotted(kc-ui-dropdown) {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
        }
    `;

    get icon() {
        return this.getAttribute("icon") ?? "question-mark";
    }

    get dropdown() {
        return this.queryAssignedElements<KCUIDropdownElement>(
            "dropdown",
            "kc-ui-dropdown",
        )[0]!;
    }

    get button() {
        return this.renderRoot.querySelector("button")!;
    }

    override initialContentCallback() {
        this.button.addEventListener("click", (e) => {
            this.dropdown.toggle();
        });

        this.addEventListener("kc-ui-dropdown:open", () => {
            this.setBooleanAttribute("open", true);
        });

        this.addEventListener("kc-ui-dropdown:close", () => {
            this.setBooleanAttribute("open", false);
        });
    }

    override render() {
        return html`<button name="toggle" type="button" title="${this.title}">
                <kc-ui-icon>${this.icon}</kc-ui-icon>
                <span>${this.title}</span>
            </button>
            <slot name="dropdown"></slot>`;
    }
}

window.customElements.define("kc-ui-toggle-menu", KCUIToggleMenuElement);
