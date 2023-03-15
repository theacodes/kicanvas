/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { delegate } from "../base/events";
import { CustomElement, html } from "../base/elements/custom-element";
import kc_ui_activity_side_bar_styles from "./kc-ui-activity-side-bar.css";

/**
 * kc-ui-activity-bar is a vscode-style side bar with an action bar with icons
 * and a panel with various activities.
 */
export class KCUIActivitySideBarElement extends CustomElement {
    static override useShadowRoot = true;
    static override styles = kc_ui_activity_side_bar_styles;
    static override exportparts = ["icon"];

    #activity: string | null | undefined;

    private get activities() {
        // Slightly hacky: using querySelectorAll on light DOM instead of slots
        // so this can be accessed before initial render.
        return this.querySelectorAll<HTMLElement>("kc-ui-activity");
    }

    private get activities_container() {
        return this.$(".activities")!;
    }

    private get buttons() {
        return this.$$<HTMLButtonElement>(`button`);
    }

    override render() {
        const top_buttons: HTMLElement[] = [];
        const bottom_buttons: HTMLElement[] = [];

        for (const activity of this.activities) {
            const name = activity.getAttribute("name");
            const icon = activity.getAttribute("icon");
            const button_location = activity.getAttribute("button-location");
            (button_location == "bottom" ? bottom_buttons : top_buttons).push(
                html`
                    <button
                        type="button"
                        tooltip-left="${name}"
                        name="${name?.toLowerCase()}"
                        title="${name}">
                        <kc-ui-icon part="icon">${icon}</kc-ui-icon>
                    </button>
                ` as HTMLElement,
            );
        }

        return html`<div class="bar">
                <div class="start">${top_buttons}</div>
                <div class="end">${bottom_buttons}</div>
            </div>
            <div class="activities">
                <slot name="activities"></slot>
            </div>`;
    }

    override initialContentCallback() {
        const default_activity = this.activities[0]?.getAttribute("name");

        if (default_activity) {
            this.change_activity(default_activity);
        }

        delegate(this.renderRoot, "button", "click", (e, source) => {
            this.change_activity((source as HTMLButtonElement).name, true);
        });
    }

    get activity() {
        return this.#activity;
    }

    set activity(name: string | null | undefined) {
        this.change_activity(name, false);
    }

    hide_activities() {
        // unset width and minWidth so the container can shrink.
        this.style.width = "unset";
        this.style.minWidth = "unset";
        // clear maxWidth, since the resizer will changes it.
        this.style.maxWidth = "";
        // set the width to 0px so that css transition works as expected.
        this.activities_container.style.width = "0px";
    }

    show_activities() {
        this.style.minWidth = "";
        this.activities_container.style.width = "";
    }

    change_activity(name: string | null | undefined, toggle = false) {
        name = name?.toLowerCase();

        // Clicking on the selected activity will deselect it.
        if (this.#activity == name && toggle) {
            this.#activity = null;
        } else {
            this.#activity = name;
        }

        // If there's no current activity, collapse the activity item
        // container
        if (!this.#activity) {
            this.hide_activities();
        } else {
            this.show_activities();
        }

        this.update_state();
    }

    private update_state() {
        // Mark the selected activity icon button as selected, clearing
        // the others.
        for (const btn of this.buttons) {
            if (btn.name == this.#activity) {
                btn.ariaSelected = "true";
            } else {
                btn.ariaSelected = "false";
            }
        }

        // Mark the selected activity element active, clearing the others.
        for (const activity of this.activities) {
            if (
                activity.getAttribute("name")?.toLowerCase() == this.#activity
            ) {
                activity.setAttribute("active", "");
            } else {
                activity.removeAttribute("active");
            }
        }
    }
}

window.customElements.define(
    "kc-ui-activity-side-bar",
    KCUIActivitySideBarElement,
);
