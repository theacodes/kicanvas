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

import { html, CustomElement } from "../dom/custom-elements";
import kc_ui_styles from "./kc-ui.css";

class KCUIAppElement extends CustomElement {
    static override styles = kc_ui_styles;
    static override useShadowRoot = false;
}

window.customElements.define("kc-ui-app", KCUIAppElement);
