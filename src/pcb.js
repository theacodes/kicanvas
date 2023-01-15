/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "./kicad/parser.js";
import { CircleSet, PolygonSet, PolylineSet } from "./gfx/vg.js";
import * as pcb_items from "./kicad/pcb_items.js";
import { Scene } from "./gfx/scene.js";
import { PanAndZoom } from "./gfx/pan_and_zoom.js";
import { CanvasSizeObserver } from "./gfx/resize.js";
import * as pcb_view from "./pcb/view.js";
import { BBox } from "./math/bbox.js";

const layers_ordered_for_controls = [
    "F.Cu",
    "In1.Cu",
    "In2.Cu",
    "B.Cu",
    "F.Paste",
    "B.Paste",
    "F.SilkS",
    "B.SilkS",
    "F.Mask",
    "B.Mask",
    "Dwgs.User",
    "Cmts.User",
    "Edge.Cuts",
    "Margin",
    "F.CrtYd",
    "B.CrtYd",
    "F.Fab",
    "B.Fab",
];

class PCBViewer {
    #cvs;
    #gl;
    #scene;
    #view;
    pcb;

    constructor(canvas) {
        this.#cvs = canvas;
    }

    async setup() {
        await this.#setup_gl();
        await this.#setup_scene();
    }

    async #setup_gl() {
        // just in case the browser still gives us a backbuffer with alpha,
        // set the background color of the canvas to black so that it behaves
        // correctly.
        this.#cvs.style.backgroundColor = "black";

        const gl = this.#cvs.getContext("webgl2", { alpha: false });
        this.#gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);

        gl.clearColor(0.074, 0.071, 0.094, 1);
        gl.clearDepth(0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        await PolygonSet.load_shader(gl);
        await PolylineSet.load_shader(gl);
        await CircleSet.load_shader(gl);
        // pcb_geometry.PCBPainter.text_shaper = await TextShaper.default();
    }

    async #setup_scene() {
        this.#scene = new Scene(this.#gl);

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
        this.#setup_board();
        this.#look_at_board();
        this.draw();
    }

    #setup_board() {
        this.#view = new pcb_view.View(this.#gl, this.pcb);
    }

    #look_at_board() {
        this.#scene.lookat(new BBox(0, 0, 400, 400));
        // const board_bbox = this.layers["Edge.Cuts"].geometry.bbox;
        // this.#scene.lookat(board_bbox.copy().grow(board_bbox.w * 0.1));
    }

    draw() {
        if (!this.#view) return;

        window.requestAnimationFrame(() => {
            this.#gl.clear(
                this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT
            );

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
            // TODO: Get actual layer color
            const color = [1, 0, 0, 1];
            const css_color = `rgb(${color[0] * 255}, ${color[1] * 255}, ${
                color[2] * 255
            })`;
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
