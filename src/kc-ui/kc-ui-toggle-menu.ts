/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html, CustomElement } from "../base/dom/custom-element";
import styles from "./kc-ui-toggle-menu.css";

import "./kc-ui-dropdown";
import { KCUIDropdownElement } from "./kc-ui-dropdown";
import { delegate } from "../base/events";
import { CSS } from "../base/dom/css";

/**
 * A toggle menu combines a button and a dropdown into a single element.
 *
 * This element holds a button and a kc-ui-dropdown, the button is used to
 * toggle the dropdown.
 */
export class KCUIToggleMenuElement extends CustomElement {
    static override styles = new CSS(styles);

    get dropdown() {
        return this.queryAssignedElements<KCUIDropdownElement>(
            "dropdown",
            "kc-ui-dropdown",
        )[0]!;
    }

    override initialContentCallback() {
        delegate(this.renderRoot, `button[slot="button"]`, "click", (e) => {
            this.dropdown.toggle();
        });

        this.addEventListener("kc-ui-dropdown:open", () => {
            this.setBooleanAttribute("open", true);
        });

        this.addEventListener("kc-ui-dropdown:close", () => {
            this.setBooleanAttribute("open", false);
        });
    }

    override render() {
        return html`<slot name="button"></slot> <slot name="dropdown"></slot>`;
    }
}

window.customElements.define("kc-ui-toggle-menu", KCUIToggleMenuElement);
