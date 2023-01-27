/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "../kicad/parser.js";
import * as pcb_items from "../kicad/pcb_items.js";
import { WebGL2Renderer } from "../gfx/webgl2_renderer.js";
import * as color_theme from "../kicad/color_theme";

import { Viewer } from "../framework/viewer.js";
import { Renderer } from "../gfx/renderer.js";
import { BoardPainter } from "./painter.js";
import { LayerSet } from "./layers.js";

export class BoardViewer extends Viewer {
    board: pcb_items.KicadPCB;
    #painter: BoardPainter;

    constructor(canvas) {
        super(canvas);

        this.addEventListener("kicanvas:viewer:select", (e: CustomEvent) => {
            const { mouse: _, items } = e.detail;

            for (const { layer: _, bbox } of items) {
                this.selected = bbox;
                break;
            }
        });
    }

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new WebGL2Renderer(canvas);
        renderer.theme = color_theme.board;
        return renderer;
    }

    override async load(url: string | URL) {
        const pcb_src = await (await window.fetch(url)).text();
        this.board = new pcb_items.KicadPCB(parse(pcb_src));

        this.#painter = new BoardPainter(this.renderer);
        this.layers = new LayerSet(this.board, this.renderer.theme);

        for (const item of this.board.items) {
            for (const layer_name of this.#painter.get_layers_for(item)) {
                this.layers.by_name(layer_name).items.push(item);
            }
        }

        let depth = 0.001;
        for (const layer of this.layers.in_display_order()) {
            this.#painter.paint_layer(layer, depth);
            depth += 0.001;
        }

        this.#look_at_board();
        this.draw_soon();
    }

    #look_at_board() {
        const edge_cuts = this.layers.by_name("Edge.Cuts");
        const board_bbox = edge_cuts.bbox;
        this.viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
    }

    draw() {
        if (!this.layers) {
            return;
        }

        const matrix = this.viewport.view_projection_matrix;

        for (const layer of this.layers.in_display_order()) {
            if (layer.visible && layer.graphics) {
                layer.graphics.draw(matrix);
            }
        }
    }
}
