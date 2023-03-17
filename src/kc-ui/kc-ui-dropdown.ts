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
            }

            :host([open]) {
                display: flex;
            }
        `,
    ];

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

    public selectable_items() {
        return this.querySelectorAll<HTMLElement>(`[aria-role="button"]`);
    }

    public get selected(): HTMLElement | null {
        return this.querySelector<HTMLElement>(`[aria-selected="true"]`);
    }

    set selected(element_or_selector: HTMLElement | string | null) {
        let new_selected: HTMLElement | null;

        if (is_string(element_or_selector)) {
            new_selected = this.querySelector(element_or_selector);
        } else {
            new_selected = element_or_selector;
        }

        if (new_selected == this.selected) {
            return;
        }

        for (const elm of this.selectable_items()) {
            elm.ariaSelected = "false";
        }

        if (!new_selected) {
            return;
        }

        new_selected.ariaSelected = "true";

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

        delegate(this, `[aria-role="button"]`, "click", (e, source) => {
            this.selected = source;
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
