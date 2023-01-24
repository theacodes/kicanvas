/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Renderer } from "../gfx/renderer.js";
import { KicadSch } from "../kicad/sch_items";
import { Matrix3 } from "../math/matrix3.js";
import { LayerSet } from "./layers.js";
import { Painter } from "./painter.js";

export class View {
    painter: Painter;
    layers: LayerSet;

    constructor(public gfx: Renderer, public sch: KicadSch) {
        this.painter = new Painter(this.gfx);
        this.layers = new LayerSet();
    }

    setup() {
        this.#assign_items_to_layers();
        this.#paint();
    }

    #assign_items_to_layers() {
        for (const item of this.sch.items()) {
            for (const layer_name of this.painter.layers_for(item)) {
                console.log(layer_name);
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

    draw(matrix: Matrix3) {
        const layers = Array.from(this.layers.in_display_order()).reverse();
        for (const layer of layers) {
            if (layer.visible && layer.graphics) {
                layer.graphics.draw(matrix);
            }
        }
    }
}
