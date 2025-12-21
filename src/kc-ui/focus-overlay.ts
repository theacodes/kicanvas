/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../base/events";
import { css, html } from "../base/web-components";
import { KCUIElement } from "./element";

/**
 * kc-ui-focus-overlay is an element that shows an overlay over its siblings
 * until the user clicks within.
 */
export class KCUIFocusOverlay extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                z-index: 10;
                user-select: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: initial;
                background: transparent;
                contain: paint;
            }

            :host(.has-focus) {
                z-index: -10;
                pointer-events: none;
            }

            .bg {
                background: var(--focus-overlay-bg);
                opacity: 0;
                transition: opacity var(--transition-time-short);
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }

            :host(:hover) .bg {
                opacity: var(--focus-overlay-opacity);
            }

            :host(.has-focus) .bg {
                opacity: 0;
            }

            .fg {
                position: absolute;
                font-size: 1.5rem;
                color: var(--focus-overlay-fg);
                text-shadow: rgba(0, 0, 0, 0.5) 0px 0px 15px;
                opacity: 0;
                pointer-events: none;
            }

            :host(:hover) .fg {
                opacity: 1;
            }

            :host(.has-focus) .fg {
                opacity: 0;
            }
        `,
    ];

    #intersection_observer: IntersectionObserver;

    override initialContentCallback(): void | undefined {
        this.addEventListener("click", () => {
            this.classList.add("has-focus");
        });

        this.addDisposable(
            listen(document, "click", (e) => {
                const outside = !e.composedPath().includes(this.parentElement!);
                if (outside) {
                    this.classList.remove("has-focus");
                }
            }),
        );

        this.#intersection_observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) {
                    this.classList.remove("has-focus");
                }
            }
        });

        this.#intersection_observer.observe(this);

        this.addDisposable({
            dispose: () => {
                this.#intersection_observer.disconnect();
            },
        });
    }

    override render() {
        return html`
            <div class="bg"></div>
            <div class="fg">Click or tap to interact</div>
        `;
    }
}

window.customElements.define("kc-ui-focus-overlay", KCUIFocusOverlay);
