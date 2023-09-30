/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

const common_styles = css`
    :host(.grow) {
        flex-basis: unset;
        flex-grow: 999;
    }

    :host(.shrink) {
        flex-grow: 0;
        flex-shrink: 1;
        width: unset;
    }

    :host:(.fixed) {
        flex-grow: 0;
        flex-shrink: 0;
    }
`;

/**
 * TODO
 */
export class KCUIView extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        common_styles,
        css`
            :host {
                flex-grow: 1;
                display: flex;
                overflow: hidden;
                flex-direction: column;
                position: relative;
            }
        `,
    ];

    override render(): Element | DocumentFragment {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-view", KCUIView);

/**
 * TODO
 */
export class KCUISplitView extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        common_styles,
        css`
            :host {
                display: flex;
                height: 100%;
                overflow: hidden;
            }

            :host([horizontal]) {
                flex-direction: column;
                max-height: 100%;
            }

            :host([vertical]) {
                flex-direction: row;
                max-width: 100%;
            }
        `,
    ];

    override render(): Element | DocumentFragment {
        return html`<slot></slot>`;
    }
}

window.customElements.define("kc-ui-split-view", KCUISplitView);
