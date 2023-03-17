/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { CustomElement, html } from "../base/dom/custom-element";
import { delegate } from "../base/events";
import { is_string } from "../base/types";
import common_styles from "./common-styles";

/**
 * kc-ui-menu and kc-ui-menu-item encompass a simple menu with selectable items.
 */

export class KCUIMenuElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                width 100%;
                display: flex;
                flex-direction: column;
                flex-wrap: nowrap;
                background: var(--list-item-bg);
                color: var(--list-item-fg);
            }

            :host(.outline) ::slotted(kc-ui-menu-item) {
                border-bottom: 1px solid var(--grid-outline);
            }

            :host(.dropdown) {
                --list-item-padding: 0.3rem 1rem 0.3rem 0.6rem;
                --list-item-bg: var(--dropdown-bg);
                --list-item-fg: var(--dropdown-fg);
                --list-item-hover-bg: var(--dropdown-hover-bg);
                --list-item-hover-fg: var(--dropdown-hover-fg);
                --list-item-active-bg: var(--dropdown-active-bg);
                --list-item-active-fg: var(--dropdown-active-fg);
            }
        `,
    ];

    constructor() {
        super();
        this.role = "menu";
    }

    public items() {
        return this.querySelectorAll<KCUIMenuItemElement>(`kc-ui-menu-item`);
    }

    public item_by_name(name: string): KCUIMenuItemElement | null {
        for (const item of this.items()) {
            if (item.name == name) {
                return item;
            }
        }
        return null;
    }

    public deselect() {
        for (const item of this.items()) {
            item.selected = false;
        }
    }

    public get selected(): KCUIMenuItemElement | null {
        for (const item of this.items()) {
            if (item.selected) {
                return item;
            }
        }
        return null;
    }

    set selected(element_or_name: KCUIMenuItemElement | string | null) {
        let new_selected: KCUIMenuItemElement | null;

        if (is_string(element_or_name)) {
            new_selected = this.item_by_name(element_or_name);
        } else {
            new_selected = element_or_name;
        }

        if (new_selected == this.selected) {
            return;
        }

        this.deselect();

        if (!new_selected || !(new_selected instanceof KCUIMenuItemElement)) {
            return;
        }

        new_selected.selected = true;

        this.dispatchEvent(
            new CustomEvent("kc-ui-menu:select", {
                detail: new_selected,
                bubbles: true,
                composed: true,
            }),
        );
    }

    override initialContentCallback() {
        super.initialContentCallback();

        delegate(this, `kc-ui-menu-item`, "click", (e, source) => {
            e.stopPropagation();
            this.selected = source as KCUIMenuItemElement;
        });
    }

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-menu", KCUIMenuElement);

export class KCUIMenuItemElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                display: flex;
                flex-wrap: nowrap;
                padding: var(--list-item-padding, 0.2rem 0.3rem);
                user-select: none;
                background: transparent;
                transition: color var(--transition-time-short) ease,
                    background-color var(--transition-time-short) ease;
                cursor: pointer;
            }

            :host(:hover) {
                background: var(--list-item-hover-bg);
                color: var(--list-item-hover-fg);
            }

            :host([selected]) {
                background: var(--list-item-active-bg);
                color: var(--list-item-active-fg);
            }

            :host([disabled]) {
                background: var(--list-item-disabled-bg);
                color: var(--list-item-disabled-fg);
            }

            ::slotted(*) {
                flex: 1 1 100%;
                display: block;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
            }

            ::slotted(.narrow) {
                max-width: 100px;
            }

            ::slotted(.very-narrow) {
                max-width: 50px;
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

    public get selected() {
        return this.getBooleanAttribute("selected");
    }

    public set selected(val: boolean) {
        this.setBooleanAttribute("selected", val);
    }

    public get disabled() {
        return this.getBooleanAttribute("disabled");
    }

    public set disabled(val: boolean) {
        this.setBooleanAttribute("disabled", val);
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

    override render() {
        const icon = this.icon
            ? html`<kc-ui-icon>${this.icon}</kc-ui-icon>`
            : undefined;
        return html`${icon}<slot></slot>`;
    }
}

window.customElements.define("kc-ui-menu-item", KCUIMenuItemElement);

export class KCUIMenuLabelElement extends CustomElement {
    static override styles = [
        common_styles,
        css`
            :host {
                width: 100%;
                display: flex;
                flex-wrap: nowrap;
                padding: 0.2rem 0.3rem;
                background: var(--panel-subtitle-bg);
                color: var(--panel-subtitle-fg);
            }
        `,
    ];

    override render() {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-menu-label", KCUIMenuLabelElement);
