/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "../board/viewer";
import { WithContext } from "../dom/context";
import { html, CustomElement } from "../dom/custom-elements";

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
        this.addEventListener("click", (e) => {
            const li = (e.target as HTMLElement).closest(
                "li[data-uuid]",
            ) as HTMLLIElement | null;

            const uuid = li?.dataset["uuid"] as string;

            if (!uuid) {
                return;
            }

            console.log("Selected net:", uuid);
        });
    }
    override render() {
        const board = this.viewer.board;

        const nets = [];

        for (const net of board.nets) {
            nets.push(
                html`<li data-number="${net.number}" aria-role="button">
                    <span class="very-narrow">${net.number}</span
                    ><span>${net.name}</span>
                </li>`,
            );
        }

        return html`
            <kc-ui-panel>
                <kc-ui-panel-header>
                    <kc-ui-panel-header-text>Nets</kc-ui-panel-header-text>
                </kc-ui-panel-header>
                <kc-ui-panel-body class="no-padding">
                    <ul class="item-list">
                        ${nets}
                    </ul>
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-board-nets-panel", KCBoardNetsPanelElement);
