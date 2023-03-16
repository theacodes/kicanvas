/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../base/events";
import { CustomElement } from "../base/dom/custom-element";
import styles from "./kc-ui-resizer.css";

/**
 * kc-ui-resizer allow re-sizing a kc-ui-view with the mouse.
 *
 * Presently it's only able to resize the element to its immediate right.
 */
export class KCUIResizerElement extends CustomElement {
    static override styles = styles;

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
