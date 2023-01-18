/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox } from "../math/bbox.js";
import { LayerSet } from "./layers.js";
import { Painter } from "./painter.js";

export class View {
    constructor(renderer, colors, board) {
        this.gfx = renderer;
        this.painter = new Painter(this.gfx);
        this.board = board;
        this.layers = new LayerSet(colors);
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
        for (const layer of this.layers.in_display_order()) {
            this.painter.paint_layer(layer);
        }
    }

    get_board_bbox() {
        const edge_cuts = this.layers.by_name("Edge.Cuts");
        return BBox.combine(edge_cuts.bboxes.values());
    }

    draw(matrix) {
        let depth = 0;
        const layers = Array.from(this.layers.in_display_order()).reverse();
        for (const layer of layers) {
            if (layer.visible && layer.enabled && layer.graphics) {
                layer.graphics.draw(matrix, depth);
            }
            depth += 0.01;
        }
    }
}
