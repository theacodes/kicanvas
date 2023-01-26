/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BoardViewer } from "./viewer.js";

class KicadPCBElement extends HTMLElement {
    #canvas: HTMLCanvasElement;
    viewer: BoardViewer;
    selected = [];

    constructor() {
        super();
    }

    get loaded() {
        return this.hasAttribute("loaded");
    }

    set loaded(value) {
        if (value) {
            this.setAttribute("loaded", "");
        } else {
            this.removeAttribute("loaded");
        }
    }

    async connectedCallback() {
        this.#renderShadowDOM();

        this.viewer = new BoardViewer(this.#canvas);
        await this.viewer.setup();
        await this.viewer.load(this.getAttribute("src"));

        this.loaded = true;
        this.dispatchEvent(new CustomEvent("kicad-pcb:loaded"));

        this.viewer.draw();
    }

    #renderShadowDOM() {
        const template = document.createElement("template");
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                canvas {
                    width: 100%;
                    height: 100%;
                }
            </style>
            <canvas></canvas>
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
        this.#canvas = root.querySelector("canvas");
    }
}

window.customElements.define("kicad-pcb", KicadPCBElement);

class KicadPCBLayerControls extends HTMLElement {
    #target;

    constructor() {
        super();
    }

    async connectedCallback() {
        this.#target = document.querySelector(`#${this.getAttribute("for")}`);

        if (this.#target.loaded) {
            this.#renderShadowDOM();
        } else {
            this.#target.addEventListener("kicad-pcb:loaded", () => {
                this.#renderShadowDOM();
            });
        }
    }

    #renderShadowDOM() {
        const viewer = this.#target.viewer;
        const buttons = [];

        for (const layer of viewer.layers.in_ui_order()) {
            const visible = layer.visible ? "yes" : "no";
            const css_color = layer.color.to_css();
            buttons.push(`
                <button type="button" name="${layer.name}" visible="${visible}">
                    <span class="color" style="background-color: ${css_color};"></span>
                    <span class="name">${layer.name}</name>
                </button>`);
        }

        const template = document.createElement("template");
        template.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                button {
                    color: white;
                    background: transparent;
                    padding: 0.5rem 1rem;
                    text-align: left;
                    border: 0 none;
                    display: flex;
                    flex-direction: row;
                    width: 100%;
                }

                button:hover {
                    background-color: #333;
                }

                button[visible="no"] {
                    color: #aaa;
                }

                .color {
                    display: inline-block;
                    width: 1rem;
                    height: 1rem;
                    margin-right: 0.5rem;
                }
            </style>
            ${buttons.join("\n")}
        `;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
        root.addEventListener("click", (e) => {
            this.#on_click(e);
        });
    }

    #on_click(e) {
        const button = e.target.closest("button");
        if (!button) {
            return;
        }

        const layer = this.#target.viewer.layers.by_name(
            button.getAttribute("name")
        );
        layer.visible = !layer.visible;
        button.setAttribute("visible", layer.visible ? "yes" : "no");
        this.#target.viewer.draw_soon();
    }
}

window.customElements.define("kicad-pcb-layer-controls", KicadPCBLayerControls);
