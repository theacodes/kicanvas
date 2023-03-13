/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Disposables, type IDisposable } from "../base/disposable";
import { is_string } from "../base/types";
import { html, literal } from "./templates";
export { html, literal };

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

    private disposables = new Disposables();

    constructor() {
        super();

        const static_this = this.constructor as typeof CustomElement;
        if (static_this.exportparts) {
            this.setAttribute("exportparts", static_this.exportparts.join(","));
        }
    }

    addDisposable<T extends IDisposable>(item: T): T {
        return this.disposables.add(item);
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

    disconnectedCallback(): void | undefined {
        this.disposables.dispose();
    }

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
            if (is_string(static_this.styles)) {
                static_this.styles = [static_this.styles];
            }

            for (const style of static_this.styles) {
                this.renderRoot.appendChild(
                    html`<style>
                        ${literal`${style}`}
                    </style>`,
                );
            }
        }

        const content = this.render();
        this.renderRoot.appendChild(content);
        this.renderedCallback();
        this.initialContentCallback();
    }
}
