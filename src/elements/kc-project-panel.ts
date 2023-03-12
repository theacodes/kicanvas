/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { WithContext } from "../dom/context";
import { CustomElement, html } from "../dom/custom-elements";
import type { Project } from "../project";

import "./kc-ui/kc-ui";

export class KCProjectPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    #toggle_btn: HTMLButtonElement;
    #panel_elm: HTMLElement;

    project: Project;

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        super.initialContentCallback();

        this.#toggle_btn.addEventListener("click", () => {
            this.open = !this.open;
        });

        this.renderRoot.addEventListener("click", (e) => {
            const li = (e.target as HTMLElement)?.closest(
                "li[data-filename]",
            ) as HTMLLIElement;

            if (!li) {
                return;
            }

            this.selected = li.dataset["filename"] ?? null;
        });

        this.setup_leave_event();
    }

    // Handles closing the panel when the mouse is well outside of the bounding
    // box.
    private setup_leave_event() {
        this.addEventListener("mouseleave", (e) => {
            if (!this.open) {
                return;
            }

            const padding = 50;
            const rect = this.getBoundingClientRect();
            const aborter = new AbortController();

            window.addEventListener(
                "mousemove",
                (e) => {
                    if (!this.open) {
                        aborter.abort();
                    }

                    const in_box =
                        e.clientX > rect.left - padding &&
                        e.clientX < rect.right + padding &&
                        e.clientY > rect.top - padding &&
                        e.clientY < rect.bottom + padding;
                    if (!in_box) {
                        this.open = false;
                        aborter.abort();
                    }
                },
                { signal: aborter.signal },
            );
        });
    }

    set open(val: boolean) {
        if (val) {
            this.#panel_elm.removeAttribute("closed");
        } else {
            this.#panel_elm.setAttribute("closed", "");
        }
    }

    get open() {
        return !this.#panel_elm.hasAttribute("closed");
    }

    get selected() {
        return (
            (
                this.#panel_elm.querySelector(
                    `li[aria-selected="true"]`,
                ) as HTMLElement
            )?.dataset["filename"] ?? null
        );
    }

    set selected(filename: string | null) {
        if (filename == this.selected) {
            return;
        }

        let selected_elm;

        for (const elm of this.#panel_elm.querySelectorAll(
            `li[aria-role="button"]`,
        )) {
            if ((elm as HTMLElement).dataset["filename"] == filename) {
                selected_elm = elm as HTMLElement;
                elm.ariaSelected = "true";
            } else {
                elm.ariaSelected = "false";
            }
        }

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

        if (!this.#toggle_btn) {
            this.#toggle_btn = html`<button
                name="toggle"
                type="button"
                title="Project">
                <kc-ui-icon>folder</kc-ui-icon>
                <span>Project</span>
            </button>` as HTMLButtonElement;
        }

        this.#panel_elm = html`<kc-ui-floating-panel closed>
            <kc-ui-floating-panel-header>
                ${this.#toggle_btn}
            </kc-ui-floating-panel-header>
            <kc-ui-floating-panel-body>
                <ul class="item-list no-bg">
                    ${file_btn_elms}
                    <li aria-role="button">
                        <kc-ui-icon>receipt</kc-ui-icon>
                        Bill of materials
                    </li>
                </ul>
            </kc-ui-floating-panel-body>
        </kc-ui-floating-panel>` as HTMLElement;

        return this.#panel_elm;
    }
}

window.customElements.define("kc-project-panel", KCProjectPanelElement);
