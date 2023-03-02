/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Common building blocks for KiCanvas's UI.
 *
 * These are basic, fundamental elements used to built KiCanvas's UI. These
 * elements are all named <kc-ui-*>, and must exist within a <kc-ui-app> parent
 *
 */

import { CustomElement } from "../dom/custom-elements";
import kc_ui_styles from "./kc-ui.css";

/**
 * kc-ui-app is the parent container for all kc-ui-* elements.
 *
 * It provides an open child DOM and the associated kc-ui.css stylesheet.
 */
class KCUIAppElement extends CustomElement {
    static override styles = kc_ui_styles;
    static override useShadowRoot = false;
}

window.customElements.define("kc-ui-app", KCUIAppElement);

/**
 * kc-ui-activity-bar allows switching between related kc-ui-activity instances,
 * sort of like a tab bar.
 */
class KCUIActivityBarElement extends CustomElement {
    static override useShadowRoot = false;

    get group() {
        return this.getAttribute("group");
    }

    get activities() {
        return (this.getRootNode() as HTMLElement | Document).querySelectorAll(
            `kc-ui-activity[group="${this.group}"]`,
        );
    }

    get buttons() {
        return this.renderRoot.querySelectorAll(`button`);
    }

    override initialContentCallback() {
        this.renderRoot.addEventListener("click", (e) => {
            const active_btn = (e.target as HTMLElement).closest("button");

            if (!active_btn) {
                return;
            }

            for (const activity of this.activities) {
                if (activity.getAttribute("name") == active_btn.name) {
                    activity.setAttribute("active", "");
                } else {
                    activity.removeAttribute("active");
                }
            }

            for (const btn of this.buttons) {
                if (btn.name == active_btn.name) {
                    btn.ariaSelected = "true";
                } else {
                    btn.ariaSelected = "false";
                }
            }
        });
    }
}

window.customElements.define("kc-ui-activity-bar", KCUIActivityBarElement);
