/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, css, html, query } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-range is a wrapper around <input type="range">
 */
export class KCUIRangeElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                display: block;
                width: 100%;
                user-select: none;
            }

            input[type="range"] {
                all: unset;
                box-sizing: border-box;
                display: block;
                width: 100%;
                max-width: 100%;
                padding-top: 0.25em;
                padding-bottom: 0.25em;
                -webkit-appearance: none;
                appearance: none;
                font: inherit;
                cursor: grab;
                background: transparent;
                transition:
                    color var(--transition-time-medium) ease,
                    box-shadow var(--transition-time-medium) ease,
                    outline var(--transition-time-medium) ease,
                    background var(--transition-time-medium) ease,
                    border var(--transition-time-medium) ease;
            }

            input[type="range"]:hover {
                z-index: 10;
                box-shadow: var(--input-range-hover-shadow);
            }

            input[type="range"]:focus {
                box-shadow: none;
                outline: none;
            }

            input[type="range"]:disabled:hover {
                cursor: unset;
            }

            input[type="range"]::-webkit-slider-runnable-track {
                box-sizing: border-box;
                height: 0.5em;
                border: 1px solid transparent;
                border-radius: 0.5em;
                background: var(--input-range-bg);
            }
            input[type="range"]::-moz-range-track {
                box-sizing: border-box;
                height: 0.5em;
                border: 1px solid transparent;
                border-radius: 0.5em;
                background: var(--input-range-bg);
            }

            input[type="range"]:hover::-webkit-slider-runnable-track,
            input[type="range"]:focus::-webkit-slider-runnable-track {
                border: 1px solid var(--input-range-hover-bg);
            }
            input[type="range"]:hover::-moz-range-track,
            input[type="range"]:focus::-moz-range-track {
                border: 1px solid var(--input-range-hover-bg);
            }

            input[type="range"]:disabled::-webkit-slider-runnable-track {
                background: var(--input-range-disabled-bg);
            }
            input[type="range"]:disabled::-moz-range-track {
                background: var(--input-range-disabled-bg);
            }

            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                height: 1em;
                width: 1em;
                border-radius: 0.5em;
                margin-top: -0.3em;
                background: var(--input-range-fg);
            }
            input[type="range"]::-moz-range-thumb {
                border: none;
                height: 1em;
                width: 1em;
                border-radius: 100%;
                margin-top: -0.3em;
                background: var(--input-range-fg);
            }

            input[type="range"]:focus::-webkit-slider-thumb {
                box-shadow: var(--input-range-handle-shadow);
            }
            input[type="range"]:focus::-moz-range-thumb {
                box-shadow: var(--input-range-handle-shadow);
            }
        `,
    ];

    @attribute({ type: String })
    name: string;

    @attribute({ type: String })
    min: string;

    @attribute({ type: String })
    max: string;

    @attribute({ type: String })
    step: string;

    @attribute({ type: Boolean })
    disabled: boolean;

    static get observedAttributes() {
        return ["disabled", "min", "max", "step", "value"];
    }

    public get value(): string {
        return this.input.value;
    }

    public set value(val: string) {
        this.input.value = val;
    }

    public get valueAsNumber(): number {
        return this.input.valueAsNumber;
    }

    @query("input", true)
    private input!: HTMLInputElement;

    attributeChangedCallback(
        name: string,
        old: string | null,
        value: string | null,
    ) {
        if (!this.input) {
            return;
        }
        switch (name) {
            case "disabled":
                this.input.disabled = value == null ? false : true;
                break;
            case "min":
                this.input.min = value ?? "";
                break;
            case "max":
                this.input.max = value ?? "";
                break;
            case "step":
                this.input.step = value ?? "";
                break;
            case "value":
                this.value = value ?? "";
                break;
        }
    }

    override initialContentCallback() {
        this.input.disabled = this.disabled;

        this.input.addEventListener("input", (e) => {
            e.stopPropagation();
            this.dispatchEvent(
                new CustomEvent("kc-ui-range:input", {
                    composed: true,
                    bubbles: true,
                }),
            );
        });
    }

    override render() {
        return html`<input
            type="range"
            min="${this.min}"
            max="${this.max}"
            step="${this.step}"
            value="${this.getAttribute("value")}">
        </input>`;
    }
}

window.customElements.define("kc-ui-range", KCUIRangeElement);
