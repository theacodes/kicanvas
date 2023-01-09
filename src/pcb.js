/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "./kicad/parser.js";
import { CircleSet, PolygonSet, PolylineSet } from "./gfx/vg.js";
import * as pcb_items from "./kicad/pcb_items.js";
import * as pcb_geometry from "./rendering/pcb_geometry.js";
import { Scene } from "./gfx/scene.js";
import { PanAndZoom } from "./gfx/pan_and_zoom.js";
import { TextShaper } from "./gfx/text.js";
import { rgba_to_f4 } from "./gfx/colorspace.js";
import { $q, $on, $template } from "./utils.js";
import { Style } from "./rendering/pcb_style.js";
import { CanvasSizeObserver } from "./gfx/resize.js";

const layers_ordered_by_visibility = [
    "B.Fab",
    "B.CrtYd",
    "B.Cu:pads",
    "B.SilkS",
    "B.Paste",
    "B.Mask",
    "B.Cu",
    "In1.Cu",
    "In2.Cu",
    "F.Cu",
    "F.Mask",
    "F.Paste",
    "F.SilkS",
    "F.Cu:pads",
    "F.CrtYd",
    "F.Fab",
    "ThroughHoles",
    "Edge.Cuts",
    "Margin",
    "Cmts.User",
    "Dwgs.User",
];

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

// TODO: Hack, remove later
const default_visible_layers = [
    "ThroughHoles",
    "F.Cu:pads",
    "B.Cu:pads",
    "F.Cu",
    "F.Paste",
    "F.SilkS",
    // "F.Mask",
    "Dwgs.User",
    "Edge.Cuts",
    "Margin",
    "F.CrtYd",
];

const special_layers_info = [
    // {
    //     name: "ThroughHoles",
    //     geometry_class: pcb_geometry.ThroughHoleLayer,
    //     colors: [
    //         [1, 0.75, 0, 1],
    //         [0.3, 0.3, 0.3, 1],
    //     ],
    // },
    {
        name: "F.Cu:pads",
        source_name: "F.Cu",
        geometry_class: pcb_geometry.Layer,
        mode: "surfacemount",
        colors: [
            [1, 0.75, 0, 1],
            [0.3, 0.3, 0.3, 1],
        ],
    },
    // {
    //     name: "B.Cu:pads",
    //     source_name: "B.Cu",
    //     geometry_class: pcb_geometry.SurfaceMountLayer,
    //     colors: [
    //         [1, 0.75, 0, 1],
    //         [0.3, 0.3, 0.3, 1],
    //     ],
    // },
];

class PCBViewer {
    #cvs;
    #gl;
    #scene;
    #painter;
    layers = {};
    pcb;

    constructor(canvas) {
        this.#cvs = canvas;
    }

    async setup() {
        await this.#setup_gl();
        await this.#setup_scene();
    }

    async #setup_gl() {
        const gl = this.#cvs.getContext("webgl2");
        this.#gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        await PolygonSet.load_shader(gl);
        await PolylineSet.load_shader(gl);
        await CircleSet.load_shader(gl);
        pcb_geometry.PCBPainter.text_shaper = await TextShaper.default();
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
        this.#setup_layers();
        this.#look_at_board();
        this.draw();
    }

    #setup_layers() {
        const style = new Style($q("kicad-pcb"));
        const gfx = new pcb_geometry.CanvasBackend(this.#gl);

        this.#painter = new pcb_geometry.PCBPainter(gfx, style);

        const layer_infos = special_layers_info.concat(
            Object.values(this.pcb.layers)
        );

        for (const layer_info of layer_infos) {
            const geometry_class =
                layer_info.geometry_class ?? pcb_geometry.Layer;
            const colors = layer_info.colors ?? [
                rgba_to_f4(style.color_for_layer(layer_info.name)),
            ];

            const layer = {
                name: layer_info.name,
                info: layer_info,
                geometry: new geometry_class(this.#gl, gfx, this.#painter),
                mode: layer_info.mode,
                colors: colors,
                visible: default_visible_layers.includes(layer_info.name),
            };

            layer.geometry.set(
                this.pcb,
                layer_info.source_name ?? layer.name,
                layer.mode
            );

            this.layers[layer.name] = layer;
        }
    }

    #look_at_board() {
        const board_bbox = this.layers["Edge.Cuts"].geometry.bbox;
        this.#scene.lookat(board_bbox.copy().grow(board_bbox.w * 0.1));
    }

    draw() {
        window.requestAnimationFrame(() => {
            this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

            let matrix = this.#scene.view_projection_matrix;

            for (const layer_name of layers_ordered_by_visibility) {
                const layer = this.layers[layer_name];

                if (!layer || !layer.visible) {
                    continue;
                }

                layer.geometry.draw(matrix, ...layer.colors);
            }
        });
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

        for (const layer_name of layers_ordered_for_controls) {
            const layer = viewer.layers[layer_name];
            const visible = layer.visible ? "yes" : "no";
            const color = layer.colors[0];
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

        const layer = this.#target.viewer.layers[button.getAttribute("name")];
        layer.visible = !layer.visible;
        button.setAttribute("visible", layer.visible ? "yes" : "no");
        this.#target.viewer.draw();
    }
}

window.customElements.define("kicad-pcb-layer-controls", KicadPCBLayerControls);
