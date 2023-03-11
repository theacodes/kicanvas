/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../dom/custom-elements";

import "./kc-ui/kc-ui";

export class KCProjectPanelElement extends CustomElement {
    static override useShadowRoot = false;
    #toggle_btn: HTMLButtonElement;
    #panel_elm: HTMLElement;

    override initialContentCallback() {
        super.initialContentCallback();

        this.#toggle_btn.addEventListener("click", () => {
            console.log("clicked");
            this.open = !this.open;
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

    override render() {
        this.#toggle_btn = html`<button
            name="toggle"
            type="button"
            title="Project">
            <kc-ui-icon>folder</kc-ui-icon>
            <span>Project</span>
        </button>` as HTMLButtonElement;

        this.#panel_elm = html`<kc-ui-floating-panel closed>
            <kc-ui-floating-panel-header>
                ${this.#toggle_btn}
            </kc-ui-floating-panel-header>
            <kc-ui-floating-panel-body>
                <ul class="item-list no-bg">
                    <li aria-role="button">
                        <kc-ui-icon>description</kc-ui-icon>
                        Schematic
                    </li>
                    <li aria-role="button">
                        <kc-ui-icon>plagiarism</kc-ui-icon>
                        Board
                    </li>
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
