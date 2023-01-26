/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "../kicad/parser.js";
import * as sch_items from "../kicad/sch_items.js";
import { Viewport } from "../gfx/viewport.js";
import { Canvas2DRenderer } from "../gfx/canvas2d_renderer.js";
import * as color_theme from "../kicad/color_theme.js";
import { View } from "./view.js";
import { Vec2 } from "../math/vec2.js";
import { BBox } from "../math/bbox.js";

export class Viewer {
    #cvs: HTMLCanvasElement;
    #renderer: Canvas2DRenderer;
    #viewport: Viewport;
    #view: View;
    sch: sch_items.KicadSch;
    selected: sch_items.SymbolInstance;
    selected_bbox: BBox;

    constructor(canvas) {
        this.#cvs = canvas;
        this.#renderer = new Canvas2DRenderer(this.#cvs);
        this.#renderer.theme = color_theme.schematic;
        this.#renderer.state.fill = color_theme.schematic.note;
        this.#renderer.state.stroke = color_theme.schematic.note;
        this.#renderer.state.stroke_width = 0.1524;

        this.#cvs.addEventListener("click", (e) => {
            const rect = this.#cvs.getBoundingClientRect();
            const mouse = this.#viewport.screen_to_world(
                new Vec2(e.clientX - rect.left, e.clientY - rect.top)
            );

            let selected;

            const interactive_layer = this.#view.layers.by_name(":Interactive");
            for (const [item, bb] of interactive_layer.bboxes.entries()) {
                if (bb.contains_point(mouse)) {
                    this.selected_bbox = bb;
                    this.selected = item as sch_items.SymbolInstance;
                    break;
                }
            }

            console.log("Selected", selected);
            this.show_selected();
            this.draw();
        });
    }

    async setup() {
        await this.#renderer.setup();

        this.#viewport = new Viewport(this.#renderer, () => {
            this.draw();
        });

        this.#viewport.enable_pan_and_zoom(0.3, 200);
    }

    async load(url) {
        const sch_src = await (await window.fetch(url)).text();
        this.sch = new sch_items.KicadSch(parse(sch_src));

        this.#view = new View(this.#renderer, this.sch);
        this.#view.setup();

        this.#look_at_schematic();
        this.draw();
    }

    #look_at_schematic() {
        const bb = this.#view.get_schematic_bbox();
        this.#viewport.camera.bbox = bb;
    }

    show_selected() {
        const overlay = this.#view.layers.by_name(":Overlay");

        overlay.graphics?.clear();

        if (!this.selected || !this.selected_bbox) {
            return;
        }

        let bb = this.selected_bbox.copy();
        bb = bb.grow(bb.w * 0.1);

        this.#renderer.start_layer(overlay.name, 1);

        this.#renderer.line(
            bb.to_polyline(0.127, color_theme.schematic.shadow)
        );
        this.#renderer.polygon(
            bb.to_polygon(color_theme.schematic.shadow.with_alpha(0.4))
        );

        overlay.graphics = this.#renderer.end_layer();
    }

    draw() {
        if (!this.sch) return;

        window.requestAnimationFrame(() => {
            const camera_matrix = this.#viewport.camera.matrix;
            this.#renderer.clear_canvas();
            this.#view.draw(camera_matrix);
        });
    }
}
