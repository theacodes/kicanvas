/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { delegate, listen } from "../../../base/events";
import { no_self_recursion } from "../../../base/functions";
import { css, html } from "../../../base/web-components";
import {
    KCUIElement,
    KCUIMenuElement,
    type KCUIMenuItemElement,
} from "../../../kc-ui";
import type { Project } from "../../project";

export class KCProjectPanelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            .page {
                display: flex;
                align-items: center;
            }

            .page span.name {
                margin-right: 1em;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
            }

            .page span.filename {
                flex: 1;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                margin-left: 1em;
                text-align: right;
                color: #aaa;
            }

            .page kc-ui-button {
                margin-left: 0.5em;
            }

            .page span.number {
                flex: 0;
                background: var(--dropdown-hover-bg);
                border: 1px solid transparent;
                border-radius: 0.5em;
                font-size: 0.8em;
                padding: 0px 0.3em;
                margin-right: 0.5em;
            }

            kc-ui-menu-item:hover span.number {
                background: var(--dropdown-bg);
            }

            kc-ui-menu-item[selected]:hover span.number {
                background: var(--dropdown-hover-bg);
            }
        `,
    ];

    #menu: KCUIMenuElement;
    project: Project;

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        super.initialContentCallback();

        this.addDisposable(
            listen(this.project, "load", (e) => {
                this.update();
            }),
        );

        this.addDisposable(
            listen(this.project, "change", (e) => {
                this.selected = this.project.active_page?.project_path ?? null;
            }),
        );

        this.addEventListener("kc-ui-menu:select", (e) => {
            const source = (e as CustomEvent).detail as KCUIMenuItemElement;
            this.selected = source?.name ?? null;
            this.change_current_project_page(this.selected);
        });

        delegate(this.renderRoot, "kc-ui-button", "click", (e, source) => {
            const menu_item = source.closest(
                "kc-ui-menu-item",
            ) as KCUIMenuItemElement;

            this.project.download(menu_item.name);
        });
    }

    get selected() {
        return this.#menu.selected?.name ?? null;
    }

    set selected(name: string | null) {
        this.#menu.selected = name;
    }

    @no_self_recursion
    private change_current_project_page(name: string | null) {
        this.project.set_active_page(name);
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
                html`<kc-ui-menu-item
                    icon="${icon}"
                    name="${page.project_path}">
                    <span class="page">
                        ${number}
                        <span class="name">
                            ${page.name ?? page.filename}
                        </span>
                        <span class="filename">
                            ${page.name && page.name !== page.filename
                                ? page.filename
                                : ""}
                        </span>
                        <kc-ui-button
                            variant="menu"
                            icon="download"
                            title="Download"></kc-ui-button>
                    </span>
                </kc-ui-menu-item>`,
            );
        }

        this.#menu = html`<kc-ui-menu>
            ${file_btn_elms}
        </kc-ui-menu>` as KCUIMenuElement;

        return html`<kc-ui-panel>
            <kc-ui-panel-title title="Project"></kc-ui-panel-title>
            <kc-ui-panel-body>${this.#menu}</kc-ui-panel-body>
        </kc-ui-panel>`;
    }
}

window.customElements.define("kc-project-panel", KCProjectPanelElement);
