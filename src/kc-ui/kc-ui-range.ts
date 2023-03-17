/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import common_styles from "./common-styles";

/**
 * kc-ui-range is a wrapper around <input type="range">
 */
export class KCUIRangeElement extends CustomElement {
    static override styles = css`
        ${common_styles}

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
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            -webkit-appearance: none;
            appearance: none;
            font: inherit;
            cursor: grab;
            background: transparent;
            transition: color var(--transition-time-medium) ease,
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
            height: 0.5rem;
            border: 1px solid transparent;
            border-radius: 0.5rem;
            background: var(--input-range-bg);
        }

        input[type="range"]:hover::-webkit-slider-runnable-track,
        input[type="range"]:focus::-webkit-slider-runnable-track {
            border: 1px solid var(--input-range-hover-bg);
        }

        input[type="range"]:disabled::-webkit-slider-runnable-track {
            background: var(--input-range-disabled-bg);
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 1rem;
            width: 1rem;
            border-radius: 0.5rem;
            margin-top: -0.3rem;
            background: var(--input-range-fg);
        }

        input[type="range"]:focus::-webkit-slider-thumb {
            box-shadow: var(--input-range-handle-shadow);
        }
    `;

    private get input() {
        return this.$<HTMLInputElement>("input")!;
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

    public get min() {
        return this.getAttribute("min");
    }

    public set min(val) {
        if (val) {
            this.setAttribute("min", val);
        } else {
            this.removeAttribute("min");
        }
    }

    public get max() {
        return this.getAttribute("max");
    }

    public set max(val) {
        if (val) {
            this.setAttribute("max", val);
        } else {
            this.removeAttribute("max");
        }
    }

    public get step() {
        return this.getAttribute("step");
    }

    public set step(val) {
        if (val) {
            this.setAttribute("step", val);
        } else {
            this.removeAttribute("step");
        }
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

    public set disabled(val: boolean) {
        this.setBooleanAttribute("disabled", val);
    }

    public get disabled() {
        return this.getBooleanAttribute("disabled");
    }

    static get observedAttributes() {
        return ["disabled", "min", "max", "step", "value"];
    }

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
        if (this.hasAttribute("disabled")) {
            this.attributeChangedCallback(
                "disabled",
                null,
                this.getAttribute("disabled"),
            );
        }
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
