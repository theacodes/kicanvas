/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import {
    ViewLayerNames as BaseLayerNames,
    ViewLayerSet as BaseLayerSet,
    ViewLayer,
} from "../base/view-layers";
import { Color } from "../../base/color";
import type { SchematicTheme } from "../../kicad";
export { ViewLayer };

export enum LayerNames {
    // Bounding boxes for clickable items
    interactive = ":Interactive",
    // DNP and other marks.
    marks = ":Marks",
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
    drawing_sheet = BaseLayerNames.drawing_sheet,
    grid = BaseLayerNames.grid,
}

/**
 * Represents the complete set of layers used by a View to draw a schematic.
 *
 * While a schematic doesn't have physical layers like a board, it still has
 * "virtual" layers used to make sure things are drawn in the right order.
 */
export class LayerSet extends BaseLayerSet {
    constructor(public theme: SchematicTheme) {
        super();

        for (const name of Object.values(LayerNames)) {
            this.add(new ViewLayer(this, name));
        }

        this.by_name(LayerNames.interactive)!.visible = false;
        this.by_name(LayerNames.interactive)!.interactive = true;
        this.by_name(LayerNames.drawing_sheet)!.color =
            (this.theme["worksheet"] as Color) ?? Color.white;
    }

    override *interactive_layers(): Generator<ViewLayer, void, unknown> {
        // Only the top interactive layer is clickable for schematics
        yield this.by_name(LayerNames.interactive)!;
    }
}
