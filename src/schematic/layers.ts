/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import {
    ViewLayerSet as BaseLayerSet,
    ViewLayerName as BaseLayerName,
    ViewLayer,
} from "../framework/view-layers";
export { ViewLayer };

export enum LayerName {
    // Bounding boxes for clickable items
    interactive = ":Interactive",
    // reference, value, other symbol fields
    symbol_field = ":Symbol:Field",
    // hierarchical, global, and local labels
    label = ":Label",
    // regular junctions, bus junctions, no connects
    junction = ":Junction",
    // wires and buses
    wire = ":Wire",
    // symbol outlines, pin names, pin numbers
    symbol_foreground = ":Symbol:Foreground",
    // Text, rectangles, etc. not inside of symbols.
    notes = ":Notes",
    bitmap = ":Bitmap",
    // symbol pins
    symbol_pin = ":Symbol:Pin",
    // symbol body fill
    symbol_background = ":Symbol:Background",
    drawing_sheet = BaseLayerName.drawing_sheet,
    grid = BaseLayerName.grid,
}

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

        for (const name of Object.values(LayerName)) {
            this.add(new ViewLayer(this, name));
        }

        this.by_name(LayerName.interactive)!.visible = false;
    }

    override *interactive_layers(): Generator<ViewLayer, void, unknown> {
        // Only the top interactive layer is clickable for schematics
        yield this.by_name(LayerName.interactive)!;
    }
}
