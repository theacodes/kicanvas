/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "../kicad/parser.js";
import * as sch_items from "../kicad/sch_items.js";
import { Viewport } from "../gfx/viewport.js";
import { Canvas2DRenderer } from "../gfx/canvas2d_renderer.js";
import { Painter } from "./painter.js";
import * as color_theme from "../kicad/color_theme.js";

export class Viewer {
    #cvs: HTMLCanvasElement;
    #renderer: Canvas2DRenderer;
    #viewport: Viewport;
    sch: sch_items.KicadSch;

    constructor(canvas) {
        this.#cvs = canvas;
        this.#renderer = new Canvas2DRenderer(this.#cvs);
        this.#renderer.theme = color_theme.schematic;
        this.#renderer.state.fill = color_theme.schematic.note;
        this.#renderer.state.stroke = color_theme.schematic.note;
        this.#renderer.state.stroke_width = 0.1524;
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

        this.#renderer.start_layer();
        for (const item of this.sch.items()) {
            Painter.paint(this.#renderer, item);
        }
        this.#renderer.end_layer();

        this.draw();
    }

    draw() {
        if (!this.sch) return;

        window.requestAnimationFrame(() => {
            const camera_matrix = this.#viewport.camera.matrix;
            this.#renderer.clear_canvas();

            for (const layer of this.#renderer.layers) {
                layer.draw(camera_matrix);
            }
        });
    }
}
