import { Layers } from "./layers.js";
import { Painter } from "./painter.js";

export class View {
    #gfx_layers = new Map();

    constructor(renderer, colors, board) {
        this.gfx = renderer;
        this.painter = new Painter(this.gfx);
        this.board = board;
        this.layers = new Layers(colors);
    }

    async setup() {
        await this.painter.setup();
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
            const gfx_layer = this.painter.paint_layer(layer);
            this.#gfx_layers.set(layer.name, gfx_layer);
        }
    }

    draw(matrix) {
        let depth = 0;
        const gfx_layers = Array.from(this.#gfx_layers.entries()).reverse();
        for (const [pcb_layer_name, gfx_layer] of gfx_layers) {
            if (this.layers.by_name(pcb_layer_name).visible) {
                gfx_layer.draw(matrix, depth);
            }
            depth += 0.01;
        }
    }
}
