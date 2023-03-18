/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { html } from "../../base/web-components";
import {
    KCUIElement,
    type KCUIDropdownElement,
    type KCUIMenuItemElement,
} from "../../kc-ui";
import type { Project } from "../project";

import "../../kc-ui";

export class KCProjectPanelElement extends KCUIElement {
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

    set selected(filename: string | null) {
        if (filename == this.selected) {
            return;
        }

        this.#selected = filename;
        this.#dropdown.menu.selected = filename;

        const selected_elm = this.#dropdown.menu.selected;

        if (!selected_elm) {
            return;
        }

        this.dispatchEvent(
            new CustomEvent("file:select", {
                detail: {
                    filename: selected_elm.name,
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

        for (const board of this.project.list_boards()) {
            file_btn_elms.push(
                html`<kc-ui-menu-item icon="plagiarism" name="${board}">
                    ${board}
                </kc-ui-menu-item>`,
            );
        }

        for (const schematic of this.project.list_schematics()) {
            file_btn_elms.push(
                html`<kc-ui-menu-item icon="description" name="${schematic}">
                    ${schematic}
                </kc-ui-menu-item>`,
            );
        }

        this.#dropdown = html`<kc-ui-dropdown slot="dropdown" auto-hide>
            <kc-ui-menu class="dropdown">
                ${file_btn_elms}
                <kc-ui-menu-item icon="receipt">
                    Bill of materials
                </kc-ui-menu-item>
            </kc-ui-menu>
        </kc-ui-dropdown>` as KCUIDropdownElement;

        return html`<kc-ui-toggle-menu icon="folder" title="Project">
            ${this.#dropdown}
        </kc-ui-toggle-menu>`;
    }
}

window.customElements.define("kc-project-panel", KCProjectPanelElement);
