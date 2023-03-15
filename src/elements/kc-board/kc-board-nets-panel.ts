/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../../board/viewer";
import { WithContext } from "../../dom/context";
import { CustomElement, html } from "../../dom/custom-elements";
import { KCUIFilteredListElement } from "../kc-ui/kc-ui-filtered-list";
import { KCUITextFilterInputElement } from "../kc-ui/kc-ui-text-filter-input";

import "../kc-ui/kc-ui-filtered-list";
import "../kc-ui/kc-ui-text-filter-input";
import { delegate } from "../../base/events";

export class KCBoardNetsPanelElement extends WithContext(CustomElement) {
    static override useShadowRoot = false;
    viewer: BoardViewer;

    override connectedCallback() {
        (async () => {
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
            this.setup_events();
        })();
    }

    private setup_events() {
        delegate(this, "li[data-number]", "click", (e, source) => {
            const number = parseInt(source?.dataset["number"] as string, 10);

            if (!number) {
                return;
            }

            this.viewer.highlight_net(number);
            this.mark_selected_item(number);
        });

        // Wire up search to filter the list
        this.search_input_elm.addEventListener("input", (e) => {
            this.item_filter_elem.filter_text =
                this.search_input_elm.value ?? null;
        });
    }

    private get search_input_elm(): KCUITextFilterInputElement {
        return this.renderRoot.querySelector("kc-ui-text-filter-input")!;
    }

    private get item_filter_elem(): KCUIFilteredListElement {
        return this.renderRoot.querySelector("kc-ui-filtered-list")!;
    }

    private get items() {
        return this.renderRoot.querySelectorAll(
            "li[data-number]",
        ) as NodeListOf<HTMLLIElement>;
    }

    private mark_selected_item(number: number) {
        for (const el of this.items) {
            const current = el.dataset["number"] == `${number}`;
            el.ariaCurrent = current ? "true" : "false";
        }
    }

    override render() {
        const board = this.viewer.board;

        const nets = [];

        for (const net of board.nets) {
            nets.push(
                html` <li
                    data-number="${net.number}"
                    aria-role="button"
                    data-match-text="${net.number} ${net.name}">
                    <span class="very-narrow"> ${net.number} </span>
                    <span>${net.name}</span>
                </li>`,
            );
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Nets</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <kc-ui-text-filter-input></kc-ui-text-filter-input>
                    <kc-ui-filtered-list>
                        <ul class="item-list outline">
                            ${nets}
                        </ul>
                    </kc-ui-filtered-list>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-board-nets-panel", KCBoardNetsPanelElement);
