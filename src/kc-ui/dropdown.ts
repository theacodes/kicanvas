/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../base/events";
import { attribute, css, html } from "../base/web-components";
import { KCUIElement } from "./element";
import { KCUIMenuElement } from "./menu";

/**
 * kc-ui-dropdown is a basic dropdown menu.
 *
 * This can be used for dropdown menus or for context menus.
 *
 * It also makes sure not to immediately close the menu when the user mouses
 * out, instead relying on a buffer zone.
 */
export class KCUIDropdownElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
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

            :host([visible]) {
                display: flex;
            }
        `,
    ];

    constructor() {
        super();
        this.mouseout_padding ??= 50;
    }

    public show() {
        if (this.visible) {
            return;
        }

        this.visible = true;
        this.dispatchEvent(
            new CustomEvent("kc-ui-dropdown:show", {
                bubbles: true,
                composed: true,
            }),
        );
    }

    public hide() {
        if (!this.visible) {
            return;
        }

        this.visible = false;
        this.dispatchEvent(
            new CustomEvent("kc-ui-dropdown:hide", {
                bubbles: true,
                composed: true,
            }),
        );
    }

    public toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    @attribute({ type: Boolean })
    visible: boolean;

    @attribute({ type: Number })
    mouseout_padding: number;

    public get menu() {
        return this.querySelector<KCUIMenuElement>("kc-ui-menu")!;
    }

    override initialContentCallback() {
        super.initialContentCallback();
        if (this.hasAttribute("auto-hide")) {
            this.setup_leave_event();
        }

        this.menu.classList.add("invert-scrollbar");
    }

    private setup_leave_event() {
        // Handles closing the panel when the mouse is well outside of the
        // bounding box.
        this.addEventListener("mouseleave", (e) => {
            if (!this.visible) {
                return;
            }

            const padding = this.mouseout_padding;
            const rect = this.getBoundingClientRect();

            const move_listener = listen(window, "mousemove", (e) => {
                if (!this.visible) {
                    move_listener.dispose();
                }

                const in_box =
                    e.clientX > rect.left - padding &&
                    e.clientX < rect.right + padding &&
                    e.clientY > rect.top - padding &&
                    e.clientY < rect.bottom + padding;
                if (!in_box) {
                    this.hide();
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
