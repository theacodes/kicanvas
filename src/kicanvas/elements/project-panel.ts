/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { delegate } from "../../base/events";
import { no_self_recursion } from "../../base/functions";
import { css, html } from "../../base/web-components";
import {
    KCUIElement,
    type KCUIDropdownElement,
    type KCUIMenuItemElement,
} from "../../kc-ui";
import type { Project } from "../project";

import "../../kc-ui";

export class KCProjectPanelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                max-width: 60vw;
            }

            .page {
                display: flex;
                align-items: center;
            }

            .page span.name {
                margin-right: 1rem;
                flex-grow: 1;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
            }

            .page span.number {
                flex: 0;
                background: var(--dropdown-hover-bg);
                border: 1px solid transparent;
                border-radius: 0.5em;
                font-size: 0.8rem;
                padding: 0px 0.3rem;
                margin-right: 0.5rem;
            }

            kc-ui-menu-item:hover span.number {
                background: var(--dropdown-bg);
            }

            kc-ui-menu-item[selected]:hover span.number {
                background: var(--dropdown-hover-bg);
            }

            .page span.filename {
                flex: 1;
                margin-left: 1rem;
                text-align: right;
                color: #aaa;
            }

            .page kc-ui-button {
                margin-left: 0.5rem;
            }
        `,
    ];

    #dropdown: KCUIDropdownElement;
    #selected: string | null;

    project: Project;

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        super.initialContentCallback();

        this.addEventListener("kc-ui-menu:select", (e) => {
            if (this.#setting_selected) return;

            const source = (e as CustomEvent).detail as KCUIMenuItemElement;
            this.selected = source?.name ?? null;
            this.send_selected_event();
        });

        delegate(this.renderRoot, "kc-ui-button", "click", (e, source) => {
            const menu_item = source.closest(
                "kc-ui-menu-item",
            ) as KCUIMenuItemElement;

            this.project.download(menu_item.name);
        });
    }

    get selected() {
        return this.#selected;
    }

    set selected(name: string | null) {
        if (name == this.selected) {
            return;
        }

        this.#setting_selected = true;
        this.#selected = name;
        this.#dropdown.menu.selected = name;
        this.#setting_selected = false;
    }

    #setting_selected = false;

    @no_self_recursion
    private send_selected_event() {
        const selected_elm = this.#dropdown.menu.selected;

        if (!selected_elm) {
            return;
        }

        this.dispatchEvent(
            new CustomEvent("file:select", {
                detail: {
                    path: selected_elm.name,
                },
                bubbles: true,
                composed: true,
            }),
        );
    }

    override render() {
        const file_btn_elms = [];

        if (!this.project) {
            return html``;
        }

        for (const page of this.project.pages()) {
            const icon =
                page.type == "schematic"
                    ? "svg:schematic_file"
                    : "svg:pcb_file";

            const number = page.page
                ? html`<span class="number">${page.page}</span>`
                : "";

            file_btn_elms.push(
                html`<kc-ui-menu-item icon="${icon}" name="${page.fullpath}">
                    <span class="page">
                        ${number}
                        <span class="name">
                            ${page.name ?? page.filename}
                        </span>
                        <span class="filename">
                            ${page.name ? page.filename : ""}
                        </span>
                        <kc-ui-button
                            variant="menu"
                            icon="download"
                            title="Download"></kc-ui-button>
                    </span>
                </kc-ui-menu-item>`,
            );
        }

        this.#dropdown = html`<kc-ui-dropdown slot="dropdown" auto-hide>
            <kc-ui-menu class="dropdown">
                <!-- <kc-ui-menu-item icon="receipt">
                    Bill of materials
                </kc-ui-menu-item> -->
                ${file_btn_elms}
            </kc-ui-menu>
        </kc-ui-dropdown>` as KCUIDropdownElement;

        return html`<kc-ui-toggle-menu icon="folder" title="Project">
            ${this.#dropdown}
        </kc-ui-toggle-menu>`;
    }
}

window.customElements.define("kc-project-panel", KCProjectPanelElement);
