/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Common building blocks for KiCanvas's UI.
 *
 * These are basic, fundamental elements used to built KiCanvas's UI. These
 * elements are all named <kc-ui-*>, and must exist within a <kc-ui-app> parent
 *
 */

import { listen } from "../base/events";
import { CustomElement } from "../base/dom/custom-element";
import kc_ui_styles from "./kc-ui.css";

/**
 * kc-ui-app is the parent container for all kc-ui-* elements.
 *
 * It provides an open child DOM and the associated kc-ui.css stylesheet.
 */
export class KCUIAppElement extends CustomElement {
    static override styles = kc_ui_styles;
    static override useShadowRoot = false;
}

window.customElements.define("kc-ui-app", KCUIAppElement);

/**
 * kc-ui-view-resizer allow re-sizing a kc-ui-view with the mouse.
 *
 * Presently it's only able to resize the element to its immediate right.
 */
export class KCUIViewResizerElement extends CustomElement {
    static override useShadowRoot = false;
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

window.customElements.define("kc-ui-view-resizer", KCUIViewResizerElement);
