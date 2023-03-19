/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

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
            .page {
                display: flex;
                align-items: center;
            }

            .page span.name {
                margin-right: 1rem;
                max-width: 50%;
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
            const source = (e as CustomEvent).detail as KCUIMenuItemElement;
            this.selected = source?.name ?? null;
        });
    }

    get selected() {
        return this.#selected;
    }

    set selected(name: string | null) {
        if (name == this.selected) {
            return;
        }

        this.#selected = name;
        this.#dropdown.menu.selected = name;

        const selected_elm = this.#dropdown.menu.selected;

        if (!selected_elm) {
            return;
        }

        const [filename, sheet_path] = selected_elm.name.split("//");

        this.dispatchEvent(
            new CustomEvent("file:select", {
                detail: {
                    filename: filename,
                    sheet_path: sheet_path,
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

        for (const board of this.project.boards()) {
            file_btn_elms.push(
                html`<kc-ui-menu-item
                    icon="plagiarism"
                    name="${board.filename}">
                    <span class="page">
                        <span class="name">Board</span>
                        <span class="filename">${board.filename}</span>
                    </span>
                </kc-ui-menu-item>`,
            );
        }

        for (const page of this.project.pages()) {
            if (page.page) {
                file_btn_elms.push(
                    html`<kc-ui-menu-item
                        icon="description"
                        name="${page.filename}//${page.path}">
                        <span class="page">
                            <span class="number">${page.page}</span>
                            <span class="name">${page.name}</span>
                            <span class="filename">${page.filename}</span>
                        </span>
                    </kc-ui-menu-item>`,
                );
            } else {
                file_btn_elms.push(
                    html`<kc-ui-menu-item
                        icon="description"
                        name="${page.filename}//${page.path}">
                        ${page.filename}
                    </kc-ui-menu-item>`,
                );
            }
        }

        this.#dropdown = html`<kc-ui-dropdown slot="dropdown" auto-hide>
            <kc-ui-menu class="dropdown">
                <kc-ui-menu-item icon="receipt">
                    Bill of materials
                </kc-ui-menu-item>
                ${file_btn_elms}
            </kc-ui-menu>
        </kc-ui-dropdown>` as KCUIDropdownElement;

        return html`<kc-ui-toggle-menu icon="folder" title="Project">
            ${this.#dropdown}
        </kc-ui-toggle-menu>`;
    }
}

window.customElements.define("kc-project-panel", KCProjectPanelElement);
