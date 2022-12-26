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

async function main() {
    const pcb_src = await (
        await window.fetch("../example-boards/simple.kicad_pcb")
    ).text();
    const pcb = new pcb_items.KicadPCB(parse(pcb_src));

    const style = new Style($q("kicad-pcb"));

    const canvas = document.querySelector("canvas");
    const gl = canvas.getContext("webgl2");
    const scene = new Scene(gl);
    new PanAndZoom(canvas, scene.camera, () => {}, {
        minZoom: 0.5,
        maxZoom: 100,
    });

    await PolygonSet.load_shader(gl);
    await PolylineSet.load_shader(gl);
    await CircleSet.load_shader(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    pcb_geometry.GeometryBuilder.text_shaper = await TextShaper.default();

    const layers = {
        ThroughHoles: {
            name: "ThroughHoles",
            geometry: new pcb_geometry.ThroughHoleLayer(gl),
            colors: [
                [1, 0.75, 0, 1],
                [0.3, 0.3, 0.3, 1],
            ],
            visible: true,
        },
        "F.Cu:pads": {
            name: "F.Cu:pads",
            geometry: new pcb_geometry.SurfaceMountLayer(gl),
            colors: [
                [1, 0.75, 0, 1],
                [0.3, 0.3, 0.3, 1],
            ],
            visible: true,
        },
        "B.Cu:pads": {
            name: "B.Cu:pads",
            geometry: new pcb_geometry.SurfaceMountLayer(gl),
            colors: [
                [1, 0.75, 0, 1],
                [0.3, 0.3, 0.3, 1],
            ],
            visible: true,
        },
    };

    layers["ThroughHoles"].geometry.set(pcb);
    layers["F.Cu:pads"].geometry.set(pcb, "F.Cu");
    layers["B.Cu:pads"].geometry.set(pcb, "B.Cu");

    for (const layer_info of Object.values(pcb.layers)) {
        const layer = {
            name: layer_info.name,
            info: layer_info,
            geometry: new pcb_geometry.Layer(gl),
            colors: [rgba_to_f4(style.color_for_layer(layer_info.name))],
            visible: true,
        };
        layer.geometry.set(pcb, layer.name);
        layers[layer.name] = layer;
    }

    const layers_ordered_by_visibility = [
        layers["B.Fab"],
        layers["B.CrtYd"],
        layers["B.Cu:pads"],
        layers["B.SilkS"],
        layers["B.Paste"],
        layers["B.Mask"],
        layers["B.Cu"],
        layers["In1.Cu"],
        layers["In2.Cu"],
        layers["F.Cu"],
        layers["F.Mask"],
        layers["F.Paste"],
        layers["F.SilkS"],
        layers["F.Cu:pads"],
        layers["F.CrtYd"],
        layers["F.Fab"],
        layers["ThroughHoles"],
        layers["Edge.Cuts"],
        layers["Margin"],
        layers["Cmts.User"],
        layers["Dwgs.User"],
    ];

    const layers_ordered_for_controls = [
        layers["F.Cu"],
        layers["In1.Cu"],
        layers["In2.Cu"],
        layers["B.Cu"],
        layers["F.Paste"],
        layers["B.Paste"],
        layers["F.SilkS"],
        layers["B.SilkS"],
        layers["F.Mask"],
        layers["B.Mask"],
        layers["Dwgs.User"],
        layers["Cmts.User"],
        layers["Edge.Cuts"],
        layers["Margin"],
        layers["F.CrtYd"],
        layers["B.CrtYd"],
        layers["F.Fab"],
        layers["B.Fab"],
    ];

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
    const debug_geom = new PolygonSet(gl);
    // debug_geom.set(debug_polys);

    const start = Date.now();

    const board_bbox = layers["Edge.Cuts"].geometry.bbox;
    scene.lookat(board_bbox.copy().grow(board_bbox.w * 0.1));

    const draw = () => {
        gl.clear(gl.COLOR_BUFFER_BIT);
        const now = Date.now();

        let matrix = scene.view_projection_matrix;

        for (const layer of layers_ordered_by_visibility) {
            if (!layer.visible) {
                continue;
            }

            layer.geometry.draw(matrix, ...layer.colors);
        }

        // debug_geom.shader.bind();
        // debug_geom.shader.u_matrix.mat3f(false, matrix.elements);
        // debug_geom.shader.u_color.f4(0, 1, 1, 0.3);
        // debug_geom.draw();

        window.requestAnimationFrame(draw);
    };

    window.requestAnimationFrame(draw);

    const aside = $q("kicad-pcb aside");

    for (const layer of layers_ordered_for_controls) {
        const button = $template(`
        <button type="button" name="${layer.name}" data-visible="${
            layer.visible ? "yes" : "no"
        }">
            <span class="color"></span><span class="name">${layer.name}</name>
        </button>
        `);
        aside.append(button);
        $on(button, "click", (e) => {
            layer.visible = !layer.visible;
            button.dataset.visible = layer.visible ? "yes" : "no";
        });
    }
}

main();
