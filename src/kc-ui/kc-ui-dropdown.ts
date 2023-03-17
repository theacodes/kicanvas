/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import { delegate, listen } from "../base/events";
import { is_string } from "../base/types";
import common_styles from "./common-styles";

/**
 * kc-ui-dropdown is a basic dropdown menu.
 *
 * This can be used for dropdown menus or for context menus.
 *
 * It also makes sure not to immediately close the menu when the user mouses
 * out, instead relying on a buffer zone.
 */
export class KCUIDropdownElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                border-radius: 5px;
                border: 1px solid transparent;
                display: none;
                flex-direction: column;
                overflow: hidden;
                user-select: none;
                background: var(--dropdown-bg);
                color: var(--dropdown-fg);
                font-weight: 300;
            }

            :host([open]) {
                display: flex;
            }
        `,
    ];

    constructor() {
        super();
        this.role = "menu";
    }

    public is_open() {
        return this.getBooleanAttribute("open");
    }

    public open() {
        if (!this.is_open()) {
            this.setBooleanAttribute("open", true);
            this.dispatchEvent(
                new CustomEvent("kc-ui-dropdown:open", {
                    bubbles: true,
                    composed: true,
                }),
            );
        }
    }

    public close() {
        if (this.is_open()) {
            this.setBooleanAttribute("open", false);
            this.dispatchEvent(
                new CustomEvent("kc-ui-dropdown:close", {
                    bubbles: true,
                    composed: true,
                }),
            );
        }
    }

    public toggle() {
        if (this.is_open()) {
            this.close();
        } else {
            this.open();
        }
    }

    private get mouseout_padding() {
        return parseInt(this.getAttribute("mouseout-padding") ?? "50", 10);
    }

    public items() {
        return this.querySelectorAll<KCUIDropdownItemElement>(
            `kc-ui-dropdown-item`,
        );
    }

    public get selected(): KCUIDropdownItemElement | null {
        for (const elm of this.items()) {
            if (elm.selected) {
                return elm;
            }
        }
        return null;
    }

    set selected(element_or_selector: KCUIDropdownItemElement | string | null) {
        let new_selected: KCUIDropdownItemElement | null;

        if (is_string(element_or_selector)) {
            new_selected =
                this.querySelector<KCUIDropdownItemElement>(
                    element_or_selector,
                );
        } else {
            new_selected = element_or_selector;
        }

        if (new_selected == this.selected) {
            return;
        }

        for (const elm of this.items()) {
            elm.selected = false;
        }

        if (
            !new_selected ||
            !(new_selected instanceof KCUIDropdownItemElement)
        ) {
            return;
        }

        new_selected.selected = true;

        this.dispatchEvent(
            new CustomEvent("kc-ui-dropdown:select", {
                detail: new_selected,
                bubbles: true,
                composed: true,
            }),
        );
    }

    override initialContentCallback() {
        super.initialContentCallback();

        delegate(this, `kc-ui-dropdown-item`, "click", (e, source) => {
            this.selected = source as KCUIDropdownItemElement;
        });

        if (this.hasAttribute("auto-close")) {
            this.setup_leave_event();
        }
    }

    private setup_leave_event() {
        // Handles closing the panel when the mouse is well outside of the
        // bounding box.
        this.addEventListener("mouseleave", (e) => {
            if (!this.is_open) {
                return;
            }

            const padding = this.mouseout_padding;
            const rect = this.getBoundingClientRect();

            const move_listener = listen(window, "mousemove", (e) => {
                if (!this.is_open) {
                    move_listener.dispose();
                }

                const in_box =
                    e.clientX > rect.left - padding &&
                    e.clientX < rect.right + padding &&
                    e.clientY > rect.top - padding &&
                    e.clientY < rect.bottom + padding;
                if (!in_box) {
                    this.close();
                    move_listener.dispose();
                }
            });
        });
    }

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-dropdown", KCUIDropdownElement);

export class KCUIDropdownItemElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                padding: 0.3rem 1rem 0.3rem 0.6rem;
                display: flex;
                background: var(--dropdown-bg);
                color: var(--dropdown-fg);
            }

            :host(:hover) {
                cursor: pointer;
                background: var(--dropdown-hover-bg);
                color: var(--dropdown-hover-fg);
            }

            :host([aria-selected="yes"]) {
                background: var(--dropdown-active-bg);
                color: var(--dropdown-active-fg);
            }

            kc-ui-icon {
                margin-right: 0.5rem;
                margin-left: -0.1rem;
            }
        `,
    ];

    constructor() {
        super();
        this.role = "menuitem";
    }

    public get name(): string {
        return this.getAttribute("name") ?? "";
    }

    public set name(string) {
        this.setAttribute("name", string);
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

    public get selected() {
        return this.getBooleanAttribute("aria-selected");
    }

    public set selected(val: boolean) {
        this.setBooleanAttribute("aria-selected", val);
    }

    override render() {
        const icon = this.icon
            ? html`<kc-ui-icon>${this.icon}</kc-ui-icon>`
            : undefined;
        return html`
            ${icon}
            <slot></slot>
        `;
    }
}

window.customElements.define("kc-ui-dropdown-item", KCUIDropdownItemElement);
