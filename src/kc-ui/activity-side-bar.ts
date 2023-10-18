/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { delegate } from "../base/events";
import { attribute, css, html, query, query_all } from "../base/web-components";
import { KCUIButtonElement } from "./button";
import { KCUIElement } from "./element";

/**
 * kc-ui-activity-bar is a vscode-style side bar with an action bar with icons
 * and a panel with various activities.
 */
export class KCUIActivitySideBarElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                flex-shrink: 0;
                display: flex;
                flex-direction: row;
                height: 100%;
                overflow: hidden;
                min-width: calc(max(20%, 200px));
                max-width: calc(max(20%, 200px));
            }

            div {
                display: flex;
                overflow: hidden;
                flex-direction: column;
            }

            div.bar {
                flex-grow: 0;
                flex-shrink: 0;
                height: 100%;
                z-index: 1;
                display: flex;
                flex-direction: column;
                background: var(--activity-bar-bg);
                color: var(--activity-bar-fg);
                padding: 0.2em;
                user-select: none;
            }

            div.start {
                flex: 1;
            }

            div.activities {
                flex-grow: 1;
            }

            kc-ui-button {
                --button-bg: transparent;
                --button-fg: var(--activity-bar-fg);
                --button-hover-bg: var(--activity-bar-active-bg);
                --button-hover-fg: var(--activity-bar-active-fg);
                --button-selected-bg: var(--activity-bar-active-bg);
                --button-selected-fg: var(--activity-bar-active-fg);
                --button-focus-outline: none;
                margin-bottom: 0.25em;
            }

            kc-ui-button:last-child {
                margin-bottom: 0;
            }

            ::slotted(kc-ui-activity) {
                display: none;
                height: 100%;
            }

            ::slotted(kc-ui-activity[active]) {
                display: block;
            }
        `,
    ];

    #activity: string | null | undefined;

    get #activities() {
        // Slightly hacky: using querySelectorAll on light DOM instead of slots
        // so this can be accessed before initial render.
        return this.querySelectorAll<HTMLElement>("kc-ui-activity");
    }

    get #activity_names() {
        return Array.from(this.#activities).map((x) => {
            return (x.getAttribute("name") ?? "").toLowerCase();
        });
    }

    get #default_activity_name() {
        return (this.#activities[0]?.getAttribute("name") ?? "").toLowerCase();
    }

    @query(".activities", true)
    private activities_container!: HTMLElement;

    @query_all("kc-ui-button")
    private buttons!: KCUIButtonElement[];

    @attribute({ type: Boolean })
    public collapsed: boolean;

    override render() {
        const top_buttons: HTMLElement[] = [];
        const bottom_buttons: HTMLElement[] = [];

        for (const activity of this.#activities) {
            const name = activity.getAttribute("name");
            const icon = activity.getAttribute("icon");
            const button_location = activity.getAttribute("button-location");
            (button_location == "bottom" ? bottom_buttons : top_buttons).push(
                html`
                    <kc-ui-button
                        type="button"
                        tooltip-left="${name}"
                        name="${name?.toLowerCase()}"
                        title="${name}"
                        icon=${icon}>
                    </kc-ui-button>
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
        if (!this.collapsed) {
            this.change_activity(this.#default_activity_name);
        } else {
            this.change_activity(null);
        }

        delegate(this.renderRoot, "kc-ui-button", "click", (e, source) => {
            this.change_activity((source as KCUIButtonElement).name, true);
        });

        const observer = new MutationObserver(async (mutations) => {
            await this.update();
            // If the currently active activity just got removed, change to the
            // new default one.
            if (
                this.#activity &&
                !this.#activity_names.includes(this.#activity)
            ) {
                this.change_activity(this.#default_activity_name);
            }
        });

        observer.observe(this, {
            childList: true,
        });
    }

    static get observedAttributes() {
        return ["collapsed"];
    }

    attributeChangedCallback(
        name: string,
        old: string | null,
        value: string | null | undefined,
    ) {
        switch (name) {
            case "collapsed":
                if (value == undefined) {
                    this.show_activities();
                } else {
                    this.hide_activities();
                }
                break;
            default:
                break;
        }
    }

    get activity() {
        return this.#activity;
    }

    set activity(name: string | null | undefined) {
        this.change_activity(name, false);
    }

    hide_activities() {
        if (!this.activities_container) {
            return;
        }

        // unset width and minWidth so the container can shrink.
        this.style.width = "unset";
        this.style.minWidth = "unset";
        // clear maxWidth, since the resizer will changes it.
        this.style.maxWidth = "";
        // set the width to 0px so that css transition works as expected.
        this.activities_container.style.width = "0px";
    }

    show_activities() {
        if (!this.activities_container) {
            return;
        }

        if (!this.#activity) {
            this.change_activity(this.#default_activity_name);
        }

        this.style.minWidth = "";
        this.activities_container.style.width = "";
    }

    change_activity(name: string | null | undefined, toggle = false) {
        name = name?.toLowerCase();

        if (this.#activity == name && toggle) {
            // Clicking on the selected activity will deselect it.
            this.#activity = null;
        } else {
            this.#activity = name;
        }

        // If there's no current activity, collapse the activity item
        // container
        if (!this.#activity) {
            this.collapsed = true;
        } else {
            this.collapsed = false;
        }

        this.update_state();
    }

    private update_state() {
        // Mark the selected activity icon button as selected, clearing
        // the others.
        for (const btn of this.buttons) {
            btn.selected = btn.name == this.#activity;
        }

        // Mark the selected activity element active, clearing the others.
        for (const activity of this.#activities) {
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
