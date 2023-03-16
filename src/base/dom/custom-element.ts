/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { as_array } from "../array";
import { Disposables, type IDisposable } from "../disposable";
import { adopt_styles, type CSS } from "./css";
import { html, literal } from "./templates";
export { html, literal };

/**
 * Base CustomElement class, provides common helpers and behavior.
 */
export class CustomElement extends HTMLElement {
    /**
     * Styles added to the shadowRoot, can be a string or list of strings.
     */
    static styles: (CSS | CSSStyleSheet) | (CSS | CSSStyleSheet)[];

    // Constructed stylesheets shared among instances.
    static _constructed_styles: CSSStyleSheet[];

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

        if (static_this.exportparts.length) {
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
        while (this.renderRoot.firstChild) {
            this.renderRoot.firstChild.remove();
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
            adopt_styles(
                this.shadowRoot ?? document,
                as_array(static_this.styles),
            );
        }

        const content = this.render();
        this.renderRoot.appendChild(content);
        this.renderedCallback();
        this.initialContentCallback();
    }

    protected $<T extends Element = HTMLElement>(selector: string) {
        return this.renderRoot.querySelector<T>(selector);
    }

    protected $$<T extends Element = HTMLElement>(selector: string) {
        return this.renderRoot.querySelectorAll<T>(selector);
    }

    protected queryAssignedElements<T extends Element = HTMLElement>(
        slot_name?: string,
        selector?: string,
    ) {
        const slot_element = this.$(
            `slot${slot_name ? `[name=${slot_name}]` : ":not([name])"}`,
        ) as HTMLSlotElement;

        const elements = (slot_element?.assignedElements() ?? []) as T[];

        if (selector) {
            return elements.filter((elm) => elm.matches(selector));
        } else {
            return elements;
        }
    }
}
