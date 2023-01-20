/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "./kicad/parser.js";
import * as pcb_items from "./kicad/pcb_items.js";
import { Viewport } from "./gfx/viewport.js";
import * as pcb_view from "./pcb/view.js";
import { WebGL2Renderer } from "./gfx/renderer.js";
import { f4_to_rgba } from "./gfx/colorspace.js";
import { board as board_colors } from "./pcb/colors.js";
import { Vec2 } from "./math/vec2.js";
import { TextShaper } from "./gfx/text.js";

class PCBViewer {
    #cvs;
    #renderer;
    #viewport;
    #view;
    pcb;

    constructor(canvas) {
        this.#cvs = canvas;
        // @ts-ignore
        this.#renderer = new WebGL2Renderer(this.#cvs, board_colors.background);

        this.#cvs.addEventListener("click", (e) => {
            const rect = this.#cvs.getBoundingClientRect();
            const mouse = this.#viewport.screen_to_world(
                new Vec2(e.clientX - rect.left, e.clientY - rect.top)
            );

            this.selected = null;

            for (const layer of this.layers.in_display_order()) {
                if (layer.visible && layer.enabled) {
                    for (const [item, bb] of layer.bboxes.entries()) {
                        if (bb.contains_point(mouse)) {
                            this.selected = item;
                            this.selected_bbox = bb;
                            break;
                        }
                    }
                }

                if (this.selected) {
                    break;
                }
            }

            console.log("Selected", this.selected);
            this.show_selected();
            this.draw();
        });
    }

    async setup() {
        await this.#renderer.setup();
        this.#renderer.context.text_shaper = await TextShaper.default();

        this.#viewport = new Viewport(this.#renderer, () => {
            this.draw();
        });
        this.#viewport.enable_pan_and_zoom(0.3, 200);
    }

    async load(url) {
        const pcb_src = await (await window.fetch(url)).text();
        this.pcb = new pcb_items.KicadPCB(parse(pcb_src));

        this.#view = new pcb_view.View(this.#renderer, board_colors, this.pcb);
        this.#view.setup();

        this.#look_at_board();
        this.draw();
    }

    #look_at_board() {
        const board_bbox = this.#view.get_board_bbox();
        this.#viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
    }

    draw() {
        if (!this.#view) return;

        window.requestAnimationFrame(() => {
            this.#renderer.clear_canvas();
            let matrix = this.#viewport.view_projection_matrix;
            this.#view.draw(matrix);
        });
    }

    get layers() {
        return this.#view.layers;
    }

    show_selected() {
        const bb = this.selected_bbox.copy().grow(this.selected_bbox.w * 0.3);
        const layer = this.layers.by_name(":Overlay");

        layer.graphics?.dispose();

        this.#renderer.start_layer();

        this.#renderer.line(
            [
                bb.top_left,
                bb.top_right,
                bb.bottom_right,
                bb.bottom_left,
                bb.top_left,
            ],
            1,
            [1, 1, 1, 1]
        );

        layer.graphics = this.#renderer.end_layer();
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
        this.#target.viewer.draw();
    }
}

window.customElements.define("kicad-pcb-layer-controls", KicadPCBLayerControls);
