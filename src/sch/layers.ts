/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { RenderLayer } from "../gfx/renderer.js";
import { BBox } from "../math/bbox.js";

/**
 * A graphical layer
 *
 * Graphical layers are responsible for tying the schematic items to graphics
 * generated using Painters.
 */
export class Layer {
    #layer_set: LayerSet;
    name: string;
    visible: boolean;

    /**
     * Schematic items that are visible on this layer.
     */
    items: any[];

    /**
     * The renderer-generated graphics for items on this layer.
     * */
    graphics: RenderLayer;

    /** A map of schematic items to bounding boxes
     * A schematic item can have graphics on multiple layers, the bounding box provided
     * here is only valid for this layer.
     */
    bboxes: Map<any, BBox> = new Map();

    /**
     * Create a new Layer.
     * @param  layer_set - the LayerSet that this Layer belongs to
     * @param name - this layer's name
     * @param visible - controls whether the layer is visible when rendering
     */
    constructor(layer_set: LayerSet, name: string, visible = true) {
        this.#layer_set = layer_set;
        this.name = name;
        this.visible = visible;
        this.items = [];
    }

    /**
     * Get the overall bounding box of all items on the layer.
     */
    get bbox() {
        return BBox.combine(this.bboxes.values(), this);
    }
}

/**
 * Represents the complete set of layers used by a View to draw a schematic.
 *
 * While a schematic doesn't have physical layers like a board, it still has
 * "virtual" layers used to make sure things are drawn in the right order.
 */
export class LayerSet {
    #layer_list: Layer[] = [];
    #layer_map: Map<string, Layer> = new Map();

    /**
     * Create a new LayerSet
     */
    constructor() {
        this.#layer_list = [
            new Layer(this, ":Interactive", false), // Bounding boxes for clickable items
            new Layer(this, ":Overlay"),
            new Layer(this, ":Symbol:Field"), // reference, value, other symbol fields
            new Layer(this, ":Label"), // hierarchical, global, and local labels
            new Layer(this, ":Junction"), // regular junctions, bus junctions, no connects
            new Layer(this, ":Wire"), // wires and bus
            new Layer(this, ":Symbol:Foreground"), // symbol outlines, pin names, pin numbers
            new Layer(this, ":Notes"), // Text, rectangles, etc. not inside of symbols.
            new Layer(this, ":Bitmap"),
            new Layer(this, ":Symbol:Pin"), // symbol pins
            new Layer(this, ":Symbol:Background"), // symbol body fill
            new Layer(this, ":Grid"),
        ];

        for (const l of this.#layer_list) {
            this.#layer_map.set(l.name, l);
        }
    }

    /**
     * @yields layers in the order they should be drawn
     */
    *in_display_order() {
        for (const layer of this.#layer_list) {
            yield layer;
        }
    }

    /**
     * Gets a Layer by name
     */
    by_name(name: string): Layer {
        return this.#layer_map.get(name);
    }
}
