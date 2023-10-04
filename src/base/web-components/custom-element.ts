/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { as_array } from "../array";
import { DeferredPromise } from "../async";
import { Disposables, type IDisposable } from "../disposable";
import { adopt_styles, type CSS } from "./css";
import { html, literal } from "./html";
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

    protected updateComplete: DeferredPromise<boolean> =
        new DeferredPromise<boolean>();

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

    async update() {
        this.updateComplete = new DeferredPromise<boolean>();
        while (this.renderRoot.firstChild) {
            this.renderRoot.firstChild.remove();
        }
        this.renderRoot.appendChild(await this.render());
        this.renderedCallback();
        window.requestAnimationFrame(() => {
            this.updateComplete.resolve(true);
        });
        return this.updateComplete;
    }

    #renderInitialContent() {
        const static_this = this.constructor as typeof CustomElement;
        this.updateComplete = new DeferredPromise<boolean>();

        if ((this.constructor as typeof CustomElement).useShadowRoot) {
            this.attachShadow({ mode: "open" });
        }

        if (static_this.styles) {
            adopt_styles(
                this.shadowRoot ?? document,
                as_array(static_this.styles),
            );
        }

        (async () => {
            const content = this.render();
            this.renderRoot.appendChild(content);
            this.renderedCallback();
            this.initialContentCallback();
            window.requestAnimationFrame(() => {
                this.updateComplete.resolve(true);
            });
        })();

        return this.updateComplete;
    }

    protected queryAssignedElements<T extends Element = HTMLElement>(
        slot_name?: string,
        selector?: string,
    ) {
        const slot_element = this.renderRoot.querySelector(
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
