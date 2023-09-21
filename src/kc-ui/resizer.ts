/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/web-components";
import { listen } from "../base/events";
import { KCUIElement } from "./element";

/**
 * kc-ui-resizer allow re-sizing a kc-ui-view with the mouse.
 *
 * Presently it's only able to resize the element to its immediate right.
 */
export class KCUIResizerElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                z-index: 999;
                user-select: none;
                display: block;
                width: 6px;
                margin-left: -6px;
                cursor: col-resize;
                background: transparent;
                opacity: 0;
                transition: opacity var(--transition-time-medium, 500) ease;
            }

            :host(:hover) {
                background: var(--resizer-bg, rebeccapurple);
                opacity: 1;
                transition: opacity var(--transition-time-short) ease;
            }

            :host(:hover.active),
            :host(.active) {
                background: var(--resizer-active-bg, rebeccapurple);
            }
        `,
    ];

    override initialContentCallback() {
        const prev = this.previousElementSibling! as HTMLElement;
        const next = this.nextElementSibling! as HTMLElement;

        this.addEventListener("mousedown", (e) => {
            const mouse_x = e.clientX;
            const width = next.getBoundingClientRect().width;

            // prevent cursor flashing
            document.body.style.cursor = "col-resize";

            // prevent selection and pointer
            prev.style.pointerEvents = "none";
            prev.style.userSelect = "none";
            next.style.pointerEvents = "none";
            next.style.userSelect = "none";

            next.style.width = `${width}px`;
            next.style.maxWidth = "unset";

            this.classList.add("active");

            // If the element we're resizing is collapsed, un-collapse it.
            if (next.hasAttribute("collapsed")) {
                console.log("removing collapsed");
                next.removeAttribute("collapsed");
            }

            const mouse_move = (e: MouseEvent) => {
                const dx = mouse_x - e.clientX;
                const new_width =
                    ((width + dx) * 100) /
                    this.parentElement!.getBoundingClientRect().width;
                next.style.width = `${new_width}%`;
            };

            const mouse_move_listener = this.addDisposable(
                listen(window, "mousemove", mouse_move),
            );

            const mouse_up = (e: MouseEvent) => {
                document.body.style.cursor = "";
                prev.style.pointerEvents = "";
                prev.style.userSelect = "";
                next.style.pointerEvents = "";
                next.style.userSelect = "";
                this.classList.remove("active");
                mouse_move_listener.dispose();
            };

            window.addEventListener("mouseup", mouse_up, { once: true });
        });
    }
}

window.customElements.define("kc-ui-resizer", KCUIResizerElement);
