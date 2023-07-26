/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox, Matrix3, Vec2 } from "../../../base/math";
import { NullRenderer } from "../../../graphics/null-renderer";
import type { SchematicTheme } from "../../../kicad";
import * as schematic_items from "../../../kicad/schematic";
import { LayerNames, LayerSet, ViewLayer } from "../layers";
import { SchematicPainter } from "../painter";
import { SchematicItemPainter } from "./base";

export class LibSymbolPainter extends SchematicItemPainter {
    classes = [schematic_items.LibSymbol];

    layers_for(item: schematic_items.LibSymbol) {
        return [
            LayerNames.symbol_background,
            LayerNames.symbol_foreground,
            LayerNames.symbol_field,
        ];
    }

    paint(layer: ViewLayer, s: schematic_items.LibSymbol, body_style = 1) {
        if (
            ![
                LayerNames.symbol_background,
                LayerNames.symbol_foreground,
                LayerNames.interactive,
            ].includes(layer.name as LayerNames)
        ) {
            return;
        }

        // Unit 0 has graphic common to all units. See LIB_SYMBOL::GetPins and
        // LIB_ITEM::m_unit.
        const common_unit = s.units.get(0);
        if (common_unit) {
            this.#paint_unit(layer, common_unit, body_style);
        }

        const si = this.view_painter.current_symbol;

        const symbol_unit = s.units.get(si?.unit || 1);

        if (symbol_unit) {
            this.#paint_unit(layer, symbol_unit, body_style);
        }
    }

    #paint_unit(
        layer: ViewLayer,
        unit: schematic_items.LibSymbol[],
        body_style = 1,
    ) {
        for (const sym of unit) {
            if (sym.style > 0 && body_style != sym.style) {
                continue;
            }

            for (const g of sym.drawings) {
                this.view_painter.paint_item(layer, g);
            }
        }
    }
}

export class SchematicSymbolPainter extends SchematicItemPainter {
    classes = [schematic_items.SchematicSymbol];

    layers_for(item: schematic_items.SchematicSymbol) {
        const layers = [
            LayerNames.interactive,
            LayerNames.symbol_foreground,
            LayerNames.symbol_background,
            LayerNames.symbol_field,
            LayerNames.symbol_pin,
        ];

        if (item.dnp) {
            layers.push(LayerNames.marks);
        }

        return layers;
    }

    paint(layer: ViewLayer, si: schematic_items.SchematicSymbol) {
        if (layer.name == LayerNames.interactive && si.lib_symbol.power) {
            // Don't draw power symbols on the interactive layer.
            return;
        }

        const transform = get_symbol_transform(si);

        this.view_painter.current_symbol = si;
        this.view_painter.current_symbol_transform = transform;

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.translation(
            si.at.position.x,
            si.at.position.y,
        );
        this.gfx.state.multiply(transform.matrix);

        const body_style = si.convert ?? 1;

        this.view_painter.paint_item(layer, si.lib_symbol, body_style);

        this.gfx.state.pop();

        if (
            [
                LayerNames.symbol_pin,
                LayerNames.symbol_foreground,
                LayerNames.interactive,
            ].includes(layer.name as LayerNames)
        ) {
            for (const pin of si.unit_pins) {
                this.view_painter.paint_item(layer, pin);
            }
        }

        if (
            layer.name == LayerNames.symbol_field ||
            layer.name == LayerNames.interactive
        ) {
            for (const [_, p] of si.properties) {
                this.view_painter.paint_item(layer, p);
            }
        }

        if (si.dnp && layer.name == LayerNames.marks) {
            const bbox = get_symbol_body_and_pins_bbox(this.theme, si);
            const width = schematic_items.DefaultValues.line_width * 3;
            const color = this.theme.erc_error;

            this.gfx.line([bbox.top_left, bbox.bottom_right], width, color);
            this.gfx.line([bbox.bottom_left, bbox.top_right], width, color);
        }

        this.view_painter.current_symbol = undefined;
    }
}

export type SymbolTransform = {
    matrix: Matrix3;
    position: Vec2;
    rotations: number;
    mirror_x: boolean;
    mirror_y: boolean;
};

/**
 * Determines the symbol position, orientation, and mirroring
 *
 * This is based on SCH_PAINTER::orientSymbol, where KiCAD does some fun logic
 * to place a symbol instance. This tries to replicate that.
 */
function get_symbol_transform(
    symbol: schematic_items.SchematicSymbol,
): SymbolTransform {
    // Note: KiCAD uses a 2x2 transformation matrix for symbol orientation. It's
    // literally the only place that uses this wacky matrix. We approximate it
    // with carefully crafted Matrix3s. KiCAD's symbol matrix is defined as
    //      [x1, x2]
    //      [y1, y2]
    // which cooresponds to a Matrix3 of
    //      [x1, x2, 0]
    //      [x1, y2, 0]
    //      [0,   0, 1]
    const zero_deg_matrix = new Matrix3([1, 0, 0, 0, -1, 0, 0, 0, 1]); // [1, 0, 0, -1]
    const ninety_deg_matrix = new Matrix3([0, -1, 0, -1, 0, 0, 0, 0, 1]); // [0, -1, -1, 0]
    const one_eighty_deg_matrix = new Matrix3([-1, 0, 0, 0, 1, 0, 0, 0, 1]); // [-1, 0, 0, 1]
    const two_seventy_deg_matrix = new Matrix3([0, 1, 0, 1, 0, 0, 0, 0, 1]); // [0, 1, 1, 0]
    let rotations = 0;

    let matrix = zero_deg_matrix;
    if (symbol.at.rotation == 0) {
        // leave matrix as is
    } else if (symbol.at.rotation == 90) {
        rotations = 1;
        matrix = ninety_deg_matrix;
    } else if (symbol.at.rotation == 180) {
        rotations = 2;
        matrix = one_eighty_deg_matrix;
    } else if (symbol.at.rotation == 270) {
        rotations = 3;
        matrix = two_seventy_deg_matrix;
    } else {
        throw new Error(`unexpected rotation ${symbol.at.rotation}`);
    }

    if (symbol.mirror == "y") {
        // * [-1, 0, 0, 1]
        const x1 = matrix.elements[0]! * -1;
        const y1 = matrix.elements[3]! * -1;
        const x2 = matrix.elements[1]!;
        const y2 = matrix.elements[4]!;
        matrix.elements[0] = x1;
        matrix.elements[1] = x2;
        matrix.elements[3] = y1;
        matrix.elements[4] = y2;
    } else if (symbol.mirror == "x") {
        // * [1, 0, 0, -1]
        const x1 = matrix.elements[0]!;
        const y1 = matrix.elements[3]!;
        const x2 = matrix.elements[1]! * -1;
        const y2 = matrix.elements[4]! * -1;
        matrix.elements[0] = x1;
        matrix.elements[1] = x2;
        matrix.elements[3] = y1;
        matrix.elements[4] = y2;
    }

    return {
        matrix: matrix,
        position: symbol.at.position,
        rotations: rotations,
        mirror_x: symbol.mirror == "x",
        mirror_y: symbol.mirror == "y",
    };
}

/**
 * Determines the bounding box for the given symbol, including only the body
 * and the pins, not any fields or text items.
 */
function get_symbol_body_and_pins_bbox(
    theme: SchematicTheme,
    si: schematic_items.SchematicSymbol,
): BBox {
    const gfx = new NullRenderer();
    const layerset = new LayerSet(theme);
    const painter = new SchematicPainter(gfx, layerset, theme);

    const layer_names = [
        LayerNames.symbol_foreground,
        LayerNames.symbol_background,
        LayerNames.symbol_pin,
    ];

    const bboxes = [];

    for (const layer_name of layer_names) {
        const layer = layerset.by_name(layer_name)!;
        layer.items.push(si);
        painter.paint_layer(layer);
        bboxes.push(layer.bbox);
    }

    return BBox.combine(bboxes);
}
