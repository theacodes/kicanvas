/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { LayerSet as BaseLayerSet, Layer } from "../framework/layers";
export { Layer };

/**
 * Represents the complete set of layers used by a View to draw a schematic.
 *
 * While a schematic doesn't have physical layers like a board, it still has
 * "virtual" layers used to make sure things are drawn in the right order.
 */
export class LayerSet extends BaseLayerSet {
    /**
     * Create a new LayerSet
     */
    constructor() {
        super();

        this.add(
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
            new Layer(this, ":Grid")
        );
    }

    override *interactive_layers(): Generator<Layer, void, unknown> {
        // Only the top interactive layer is clickable for schematics
        yield this.by_name(":Interactive");
    }
}
