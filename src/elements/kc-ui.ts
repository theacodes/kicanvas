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
    current_activity: string | null;

    get group() {
        return this.getAttribute("group");
    }

    get activities() {
        return (this.getRootNode() as HTMLElement | Document).querySelectorAll(
            `kc-ui-activity[group="${this.group}"]`,
        );
    }

    get activity_container() {
        return this.activities[0]?.parentElement;
    }

    get buttons() {
        return this.renderRoot.querySelectorAll(`button`);
    }

    override initialContentCallback() {
        for (const activity of this.activities) {
            if (activity.getAttribute("active") != null) {
                this.current_activity = activity.getAttribute("name");
            }
        }

        this.renderRoot.addEventListener("click", (e) => {
            const active_btn = (e.target as HTMLElement).closest("button");

            if (!active_btn) {
                return;
            }

            if (this.current_activity == active_btn.name) {
                this.current_activity = null;
            } else {
                this.current_activity = active_btn.name;
            }

            if (this.activity_container) {
                if (this.current_activity) {
                    this.activity_container.setAttribute(
                        "current-activity",
                        this.current_activity,
                    );
                } else {
                    this.activity_container.removeAttribute("current-activity");
                }
            }

            for (const activity of this.activities) {
                if (activity.getAttribute("name") == this.current_activity) {
                    activity.setAttribute("active", "");
                } else {
                    activity.removeAttribute("active");
                }
            }

            for (const btn of this.buttons) {
                if (btn.name == this.current_activity) {
                    btn.ariaSelected = "true";
                } else {
                    btn.ariaSelected = "false";
                }
            }
        });
    }
}

window.customElements.define("kc-ui-activity-bar", KCUIActivityBarElement);
