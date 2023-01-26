/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Renderer } from "../gfx/renderer.js";
import { KicadPCB } from "../kicad/pcb_items.js";
import { BBox } from "../math/bbox.js";
import { Matrix3 } from "../math/matrix3.js";
import { LayerSet } from "./layers.js";
import { Painter } from "./painter.js";

export class View {
    painter: Painter;
    layers: LayerSet;

    constructor(
        public gfx: Renderer,
        public board: KicadPCB,
        public color_theme
    ) {
        this.painter = new Painter(this.gfx);
        this.layers = new LayerSet(color_theme);
    }

    setup() {
        this.#set_enabled_layers();
        this.#assign_items_to_layers();
        this.#paint();
    }

    #set_enabled_layers() {
        for (const board_layer of Object.values(this.board.layers)) {
            const layer = this.layers.by_name(board_layer.name);
            layer.enabled = true;
            layer.visible = true;
        }
    }

    #assign_items_to_layers() {
        for (const item of this.board.items) {
            for (const layer_name of this.painter.get_layers_for(item)) {
                this.layers.by_name(layer_name).items.push(item);
            }
        }
    }

    #paint() {
        let depth = 0.999;
        for (const layer of this.layers.in_display_order()) {
            this.painter.paint_layer(layer, depth);
            depth -= 0.001;
        }
    }

    get_board_bbox(): BBox {
        const edge_cuts = this.layers.by_name("Edge.Cuts");
        return BBox.combine(edge_cuts.bboxes.values());
    }

    draw(matrix: Matrix3) {
        const layers = Array.from(this.layers.in_display_order()).reverse();
        for (const layer of layers) {
            if (layer.visible && layer.enabled && layer.graphics) {
                layer.graphics.draw(matrix);
            }
        }
    }
}
