/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * A basic html tagged template literal.
 * It allows html elements (and arrays thereof) to be used in template literals
 * while preserving their identity in the final rendered object.
 */
export function html(
    strings: TemplateStringsArray,
    ...values: any[]
): Element | DocumentFragment {
    const replacements = [];
    let out = "";

    for (let i = 0; i < values.length; i++) {
        let value = values[i];
        out += strings[i];

        if (!Array.isArray(value)) {
            value = [value];
        }

        for (const v of value) {
            if (v instanceof HTMLElement || v instanceof DocumentFragment) {
                replacements.push(v);
                out += `<slot replace></slot>`;
            } else {
                out += `${v}`;
            }
        }
    }

    out += strings[strings.length - 1];

    const template = document.createElement(`template`);
    template.innerHTML = out;

    const slots = template.content.querySelectorAll("slot[replace]");
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const replacement = replacements[i];
        slot.replaceWith(replacement);
    }

    if (template.content.childElementCount == 1) {
        return template.content.firstElementChild;
    } else {
        return template.content;
    }
}

export class CustomElement extends HTMLElement {
    static styles: string | string[];

    constructor() {
        super();
    }

    async connectedCallback() {
        this.#renderInitialContent();
    }

    async render(root: ShadowRoot): Promise<Element | DocumentFragment> {
        return html``;
    }

    async update() {
        for (const child of this.shadowRoot.children) {
            if (child.tagName != "STYLE") {
                child.remove();
            }
        }
        this.shadowRoot.appendChild(await this.render(this.shadowRoot));
    }

    async #renderInitialContent() {
        const static_this = this.constructor as typeof CustomElement;

        const root = this.attachShadow({ mode: "open" });

        const style = html`<style>
            ${static_this.styles}
        </style>`;

        root.appendChild(style);
        root.appendChild(await this.render(root));
    }
}
