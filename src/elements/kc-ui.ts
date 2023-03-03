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
 * kc-ui-view-resizer allow re-sizing a kc-ui-view with the mouse.
 *
 * Presently it's only able to resize the element to its immediate right.
 */
class KCUIViewResizerElement extends CustomElement {
    static override useShadowRoot = false;
    override initialContentCallback() {
        const prev = this.previousElementSibling! as HTMLElement;
        const next = this.nextElementSibling! as HTMLElement;

        this.addEventListener("mousedown", (e) => {
            const mouse_x = e.clientX;
            const width = next.getBoundingClientRect().width;

            // prevent cursor flashing
            document.body.style.cursor = "col-resize";

            // prevent selection and pointer
            prev.style.pointerEvents = "none";
            prev.style.userSelect = "none";
            next.style.pointerEvents = "none";
            next.style.userSelect = "none";

            next.style.width = `${width}px`;
            next.style.maxWidth = "unset";

            this.classList.add("active");

            const mouse_move = (e: MouseEvent) => {
                const dx = mouse_x - e.clientX;
                const new_width =
                    ((width + dx) * 100) /
                    this.parentElement!.getBoundingClientRect().width;
                next.style.width = `${new_width}%`;
            };

            window.addEventListener("mousemove", mouse_move);

            const mouse_up = (e: MouseEvent) => {
                document.body.style.cursor = "";
                prev.style.pointerEvents = "";
                prev.style.userSelect = "";
                next.style.pointerEvents = "";
                next.style.userSelect = "";
                this.classList.remove("active");
                window.removeEventListener("mousemove", mouse_move);
            };

            window.addEventListener("mouseup", mouse_up, { once: true });
        });
    }
}

window.customElements.define("kc-ui-view-resizer", KCUIViewResizerElement);

/**
 * kc-ui-activity-bar allows switching between related kc-ui-activity instances,
 * sort of like a tab bar.
 */
class KCUIActivityBarElement extends CustomElement {
    static override useShadowRoot = false;
    current_activity: string | null;

    get activity_elms() {
        return this.activity_item_container.querySelectorAll("kc-ui-activity");
    }

    get activity_item_container() {
        return this.container.querySelector(
            ".activity-item-container",
        )! as HTMLElement;
    }

    get button_elms() {
        return this.renderRoot.querySelectorAll(`button`);
    }

    get container() {
        return this.closest(".activity-container")! as HTMLElement;
    }

    override initialContentCallback() {
        for (const activity of this.activity_elms) {
            if (activity.getAttribute("active") != null) {
                this.current_activity = activity.getAttribute("name");
            }
        }

        this.renderRoot.addEventListener("click", (e) => {
            const active_btn = (e.target as HTMLElement).closest("button");

            if (!active_btn) {
                return;
            }

            // Clicking on the selected activity will deselect it.
            if (this.current_activity == active_btn.name) {
                this.current_activity = null;
            } else {
                this.current_activity = active_btn.name;
            }

            // Mark the selected activity icon button as selected, clearing
            // the others.
            for (const btn of this.button_elms) {
                if (btn.name == this.current_activity) {
                    btn.ariaSelected = "true";
                } else {
                    btn.ariaSelected = "false";
                }
            }

            // If there's no current activity, collapse the activity item
            // container
            if (!this.current_activity) {
                this.container.style.width = "unset";
                // unset minWidth so the container can shrink.
                this.container.style.minWidth = "unset";
                // clear maxWidth, since the resizer will changes it.
                this.container.style.maxWidth = "";
                this.activity_item_container.style.width = "0px";
                return;
            } else {
                this.container.style.minWidth = "";
                this.activity_item_container.style.width = "";
            }

            // Mark the selected activity element active, clearing the others.
            for (const activity of this.activity_elms) {
                if (activity.getAttribute("name") == this.current_activity) {
                    activity.setAttribute("active", "");
                } else {
                    activity.removeAttribute("active");
                }
            }
        });
    }
}

window.customElements.define("kc-ui-activity-bar", KCUIActivityBarElement);
