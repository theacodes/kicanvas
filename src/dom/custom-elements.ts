/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

type ElementOrFragment = HTMLElement | DocumentFragment;

/**
 * A basic html tagged template literal.
 * It allows html elements (and arrays thereof) to be used in template literals
 * while preserving their identity in the final rendered object.
 */
export function html(
    strings: TemplateStringsArray,
    ...values: any[]
): ElementOrFragment {
    const replacements: ElementOrFragment[] = [];
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

    const content = document.importNode(template.content, true);

    const slots = content.querySelectorAll("slot[replace]");
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        const replacement = replacements[i]!;
        slot.replaceWith(replacement);
    }

    if (content.childElementCount == 1) {
        return content.firstElementChild as HTMLElement;
    } else {
        return content;
    }
}

/**
 * "Just enough" CustomElement helper.
 */
export class CustomElement extends HTMLElement {
    /**
     * Styles added to the shadowRoot, can be a string or list of strings.
     */
    static styles: string | string[];

    /**
     * If true, a shadowRoot is created for this element.
     */
    static useShadowRoot = true;

    /**
     * Exports nested shadow dom parts
     * https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts
     */
    static exportparts: string[] = [];

    constructor() {
        super();

        const static_this = this.constructor as typeof CustomElement;
        if (static_this.exportparts) {
            this.setAttribute("exportparts", static_this.exportparts.join(","));
        }
    }

    /**
     * Returns either the shadowRoot or this if useShadowRoot is false.
     */
    get renderRoot(): ShadowRoot | this {
        return this.shadowRoot ?? this;
    }

    /**
     * Set a boolean attribute.
     *
     * Adds attribute="yes" if true, removes it altogether if false.
     */
    setBooleanAttribute(
        qualifiedName: string,
        value: boolean,
        true_string = "yes",
    ): void {
        if (value) {
            this.setAttribute(qualifiedName, true_string);
        } else {
            this.removeAttribute(qualifiedName);
        }
    }

    /**
     * Gets a boolean attribute.
     *
     * Returns true if the attribute is present and not set to "false" or "no".
     */
    getBooleanAttribute(qualifiedName: string): boolean {
        if (!this.hasAttribute(qualifiedName)) {
            return false;
        }

        const val = this.getAttribute(qualifiedName);

        if (val == "false" || val == "no") {
            return false;
        }

        return true;
    }

    /**
     * Called when connected to the DOM
     *
     * By default it calls render() to place the initial content to the
     * renderRoot.
     */
    connectedCallback(): void | undefined {
        this.#renderInitialContent();
    }

    disconnectedCallback(): void | undefined {}

    /**
     * Called after the initial content is added to the renderRoot, perfect
     * for registering event callbacks.
     */
    initialContentCallback(): void | undefined {}

    /**
     * Called to render content to the renderRoot.
     */
    render(): Element | DocumentFragment {
        return html``;
    }

    renderedCallback(): void | undefined {}

    update(): void | undefined {
        for (const child of this.renderRoot.children) {
            if (child.tagName != "STYLE") {
                child.remove();
            }
        }
        this.renderRoot.appendChild(this.render());
        this.renderedCallback();
    }

    #renderInitialContent() {
        const static_this = this.constructor as typeof CustomElement;

        if ((this.constructor as typeof CustomElement).useShadowRoot) {
            this.attachShadow({ mode: "open" });
        }

        if (static_this.styles) {
            if (typeof static_this.styles == "string") {
                static_this.styles = [static_this.styles];
            }

            for (const style of static_this.styles) {
                this.renderRoot.appendChild(
                    html`<style>
                        ${style}
                    </style>`,
                );
            }
        }

        this.renderRoot.appendChild(this.render());
        this.renderedCallback();
        this.initialContentCallback();
    }
}
