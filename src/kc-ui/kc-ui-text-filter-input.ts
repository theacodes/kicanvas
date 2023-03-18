/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import { query } from "../base/dom/decorators";
import common_styles from "./common-styles";

export class KCUITextFilterInputElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                display: flex;
                align-items: center;
                align-content: center;
                position: relative;
                border-bottom: 1px solid var(--grid-outline);
            }

            kc-ui-icon.before {
                pointer-events: none;
                position: absolute;
                left: 0;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding-left: 0.25em;
            }

            input {
                all: unset;
                display: block;
                width: 100%;
                max-width: 100%;
                border-radius: 0;
                padding: 0.4rem;
                padding-left: 1.5em;
                text-align: left;
                font: inherit;
                background: var(--input-bg);
                color: var(--input-fg);
            }

            input:placeholder-shown + button {
                display: none;
            }

            button {
                all: unset;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                color: var(--input-fg);
                padding: 0.25em;
            }

            button:hover {
                cursor: pointer;
                color: var(--input-accent);
            }
        `,
    ];

    @query("input", true)
    private input!: HTMLInputElement;

    get value() {
        return this.input.value;
    }

    set value(v) {
        this.input.value = v;
        this.input.dispatchEvent(
            new Event("input", { bubbles: true, composed: true }),
        );
    }

    @query("button", true)
    private button: HTMLButtonElement;

    override initialContentCallback(): void | undefined {
        super.initialContentCallback();

        this.button.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.value = "";
        });
    }

    override render() {
        return html`<kc-ui-icon class="flex before">search</kc-ui-icon>
            <input style="" type="text" placeholder="search" name="search" />
            <button type="button">
                <kc-ui-icon>close</kc-ui-icon>
            </button>`;
    }
}

window.customElements.define(
    "kc-ui-text-filter-input",
    KCUITextFilterInputElement,
);
