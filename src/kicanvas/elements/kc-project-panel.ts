/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { WithContext } from "../../base/elements/context";
import { CustomElement, html } from "../../base/elements/custom-element";
import type { KCUIDropdownElement } from "../../kc-ui/kc-ui-dropdown";
import type { Project } from "../project";

import "../../kc-ui/kc-ui";
import "../../kc-ui/kc-ui-dropdown";
import "../../kc-ui/kc-ui-toggle-menu";

export class KCProjectPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
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

        this.addEventListener("kc-ui-dropdown:select", (e) => {
            const source = (e as CustomEvent).detail as HTMLElement;
            this.selected = source?.dataset["filename"] ?? null;
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
        this.#dropdown.selected = `[data-filename="${filename}"]`;

        const selected_elm = this.#dropdown.selected;

        if (!selected_elm) {
            return;
        }

        this.dispatchEvent(
            new CustomEvent("file:select", {
                detail: {
                    filename: selected_elm.dataset["filename"],
                    type: selected_elm.dataset["type"],
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
                html`<li
                    aria-role="button"
                    data-filename="${board}"
                    data-type="board">
                    <kc-ui-icon>plagiarism</kc-ui-icon>
                    ${board}
                </li>`,
            );
        }

        for (const schematic of this.project.list_schematics()) {
            file_btn_elms.push(
                html`<li
                    aria-role="button"
                    data-filename="${schematic}"
                    data-type="schematic">
                    <kc-ui-icon>description</kc-ui-icon>
                    ${schematic}
                </li>`,
            );
        }

        this.#dropdown = html`<kc-ui-dropdown slot="dropdown"
            ><ul>
                ${file_btn_elms}
                <li aria-role="button">
                    <kc-ui-icon>receipt</kc-ui-icon>
                    Bill of materials
                </li>
            </ul></kc-ui-dropdown
        >` as KCUIDropdownElement;

        return html`<kc-ui-toggle-menu>
            <button slot="button" name="toggle" type="button" title="Project">
                <kc-ui-icon>folder</kc-ui-icon>
                <span>Project</span>
            </button>
            ${this.#dropdown}
        </kc-ui-toggle-menu>`;
    }
}

window.customElements.define("kc-project-panel", KCProjectPanelElement);
