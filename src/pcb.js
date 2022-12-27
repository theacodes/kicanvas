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

const special_layers_info = [
    {
        name: "ThroughHoles",
        geometry_class: pcb_geometry.ThroughHoleLayer,
        colors: [
            [1, 0.75, 0, 1],
            [0.3, 0.3, 0.3, 1],
        ],
    },
    {
        name: "F.Cu:pads",
        source_name: "F.Cu",
        geometry_class: pcb_geometry.SurfaceMountLayer,
        colors: [
            [1, 0.75, 0, 1],
            [0.3, 0.3, 0.3, 1],
        ],
    },
    {
        name: "B.Cu:pads",
        source_name: "B.Cu",
        geometry_class: pcb_geometry.SurfaceMountLayer,
        colors: [
            [1, 0.75, 0, 1],
            [0.3, 0.3, 0.3, 1],
        ],
    },
];

class PCBViewer {
    #cvs;
    #gl;
    #scene;
    #layers = {};
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
        pcb_geometry.GeometryBuilder.text_shaper = await TextShaper.default();
    }

    async #setup_scene() {
        this.#scene = new Scene(this.#gl);

        new CanvasSizeObserver(this.#cvs, (_, ...args) => {
            this.#scene.resize(...args);
            this.draw_soon();
        });

        new PanAndZoom(
            this.#cvs,
            this.#scene.camera,
            () => {
                this.draw_soon();
            },
            {
                minZoom: 0.5,
                maxZoom: 100,
            }
        );
    }

    async load(url) {
        const pcb_src = await (await window.fetch(url)).text();
        this.pcb = new pcb_items.KicadPCB(parse(pcb_src));
        this.#setup_layers();
        this.#look_at_board();
        this.draw_soon();
    }

    #setup_layers() {
        const style = new Style($q("kicad-pcb"));

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
                geometry: new geometry_class(this.#gl),
                colors: colors,
                visible: true,
            };

            layer.geometry.set(this.pcb, layer_info.source_name ?? layer.name);

            this.#layers[layer.name] = layer;
        }
    }

    #look_at_board() {
        const board_bbox = this.#layers["Edge.Cuts"].geometry.bbox;
        this.#scene.lookat(board_bbox.copy().grow(board_bbox.w * 0.1));
    }

    draw_soon() {
        window.requestAnimationFrame(() => {
            this.draw();
        });
    }

    draw() {
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

        let matrix = this.#scene.view_projection_matrix;

        for (const layer_name of layers_ordered_by_visibility) {
            const layer = this.#layers[layer_name];

            if (!layer || !layer.visible) {
                continue;
            }

            layer.geometry.draw(matrix, ...layer.colors);
        }
    }
}

async function main() {
    const pcb_url = "../example-boards/simple.kicad_pcb";
    const canvas = document.querySelector("canvas");

    const pcb_viewer = new PCBViewer(canvas);
    await pcb_viewer.setup();
    await pcb_viewer.load(pcb_url);

    // const debug_polys = [
    //     PolygonSet.triangulate([new Vec2(-1, -1000), new Vec2(1, -1000), new Vec2(1, 1000), new Vec2(-1, 1000)]),
    //     PolygonSet.triangulate([new Vec2(-1000, -1), new Vec2(-1000, 1), new Vec2(1000, 1), new Vec2(1000, -1)]),
    // ];

    // for(const bb of fcu_layer.bboxes) {
    //     const points = [
    //         bb.start,
    //         new Vec2(bb.start.x, bb.end.y),
    //         bb.end,
    //         new Vec2(bb.end.x, bb.start.y),
    //         bb.start,
    //     ];
    //     debug_polys.push(PolygonSet.triangulate(points));
    // }
    // const debug_geom = new PolygonSet(gl);
    // debug_geom.set(debug_polys);

    // const aside = $q("kicad-pcb aside");

    // for (const layer of layers_ordered_for_controls) {
    //     const button = $template(`
    //     <button type="button" name="${layer.name}" data-visible="${
    //         layer.visible ? "yes" : "no"
    //     }">
    //         <span class="color"></span><span class="name">${layer.name}</name>
    //     </button>
    //     `);
    //     aside.append(button);
    //     $on(button, "click", (e) => {
    //         layer.visible = !layer.visible;
    //         button.dataset.visible = layer.visible ? "yes" : "no";
    //     });
    // }
}

main();
