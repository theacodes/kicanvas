/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "./kicad/parser.js";
import * as pcb_items from "./kicad/pcb_items.js";
import { Scene } from "./gfx/scene.js";
import { PanAndZoom } from "./gfx/pan_and_zoom.js";
import { CanvasSizeObserver } from "./gfx/resize.js";
import * as pcb_view from "./pcb/view.js";
import { BBox } from "./math/bbox.js";
import { WebGl2Renderer } from "./rendering/webgl2.js";
import { f4_to_rgba } from "./gfx/colorspace.js";
import { board as board_colors } from "./pcb/colors.js";

class PCBViewer {
    #cvs;
    #renderer;
    #scene;
    #view;
    pcb;

    constructor(canvas) {
        this.#cvs = canvas;
        this.#renderer = new WebGl2Renderer(this.#cvs, board_colors.background);
    }

    async setup() {
        await this.#renderer.setup();
        await this.#setup_scene();
    }

    async #setup_scene() {
        this.#scene = new Scene(this.#renderer);

        new CanvasSizeObserver(this.#cvs, (_, ...args) => {
            this.#scene.resize(...args);
            this.draw();
        });

        new PanAndZoom(
            this.#cvs,
            this.#scene.camera,
            () => {
                this.draw();
            },
            {
                minZoom: 0.5,
                maxZoom: 130,
            }
        );
    }

    async load(url) {
        const pcb_src = await (await window.fetch(url)).text();
        this.pcb = new pcb_items.KicadPCB(parse(pcb_src));
        this.#setup_view();
        this.#look_at_board();
        this.draw();
    }

    #setup_view() {
        this.#view = new pcb_view.View(this.#renderer, board_colors, this.pcb);
    }

    #look_at_board() {
        this.#scene.lookat(new BBox(0, 0, 200, 200));
        // const board_bbox = this.layers["Edge.Cuts"].geometry.bbox;
        // this.#scene.lookat(board_bbox.copy().grow(board_bbox.w * 0.1));
    }

    draw() {
        if (!this.#view) return;

        window.requestAnimationFrame(() => {
            this.#renderer.clear_canvas();
            let matrix = this.#scene.view_projection_matrix;
            this.#view.draw(matrix);
        });
    }

    get layers() {
        return this.#view.layers;
    }
}

class KicadPCBElement extends HTMLElement {
    #canvas;
    viewer;

    constructor() {
        super();
        this.selected = [];
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

        this.viewer = new PCBViewer(this.#canvas);
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

        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.#canvas = this.shadowRoot.querySelector("canvas");
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
            const color = layer.color;
            const css_color = f4_to_rgba([...color.slice(0, 3), 1]);
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

        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.shadowRoot.addEventListener("click", (e) => {
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
        this.#target.viewer.draw();
    }
}

window.customElements.define("kicad-pcb-layer-controls", KicadPCBLayerControls);
