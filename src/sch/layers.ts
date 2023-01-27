/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import {
    ViewLayerSet as BaseLayerSet,
    ViewLayer,
} from "../framework/view-layers";
export { ViewLayer as Layer };

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
            new ViewLayer(this, ":Interactive", false), // Bounding boxes for clickable items
            new ViewLayer(this, ":Overlay"),
            new ViewLayer(this, ":Symbol:Field"), // reference, value, other symbol fields
            new ViewLayer(this, ":Label"), // hierarchical, global, and local labels
            new ViewLayer(this, ":Junction"), // regular junctions, bus junctions, no connects
            new ViewLayer(this, ":Wire"), // wires and bus
            new ViewLayer(this, ":Symbol:Foreground"), // symbol outlines, pin names, pin numbers
            new ViewLayer(this, ":Notes"), // Text, rectangles, etc. not inside of symbols.
            new ViewLayer(this, ":Bitmap"),
            new ViewLayer(this, ":Symbol:Pin"), // symbol pins
            new ViewLayer(this, ":Symbol:Background"), // symbol body fill
            new ViewLayer(this, ":Grid")
        );
    }

    override *interactive_layers(): Generator<ViewLayer, void, unknown> {
        // Only the top interactive layer is clickable for schematics
        yield this.by_name(":Interactive");
    }
}
