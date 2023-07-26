/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { Color } from "../../../base/color";
import type { SchematicTheme } from "../../../kicad";
import * as schematic_items from "../../../kicad/schematic";
import { DocumentPainter, ItemPainter } from "../../base/painter";
import { LayerNames, type ViewLayer } from "../layers";
import type { SchematicPainter } from "../painter";
import type { SymbolTransform } from "./symbol";

export abstract class BaseSchematicPainter extends DocumentPainter {
    override theme: SchematicTheme;
    current_symbol?: schematic_items.SchematicSymbol;
    current_symbol_transform?: SymbolTransform;
}

export abstract class SchematicItemPainter extends ItemPainter {
    override view_painter: SchematicPainter;

    override get theme(): SchematicTheme {
        return this.view_painter.theme;
    }

    protected get is_dimmed() {
        return this.view_painter.current_symbol?.dnp ?? false;
    }

    protected dim_color(color: Color) {
        // See SCH_PAINTER::getRenderColor, this desaturates the color and
        // mixes it 50% with the background color. While you might think 50%
        // alpha would be fine, it ends up showing the grid and other stuff
        // behind it.
        color = color.desaturate();
        return color.mix(this.theme.background, 0.5);
    }

    protected dim_if_needed(color: Color) {
        return this.is_dimmed ? this.dim_color(color) : color;
    }

    protected determine_stroke(
        layer: ViewLayer,
        item: schematic_items.GraphicItem,
    ) {
        const width = item.stroke?.width || this.gfx.state.stroke_width;

        if (width < 0) {
            return { width: 0, color: null };
        }

        const stroke_type = item.stroke?.type ?? "none";

        if (stroke_type == "none") {
            return { width: 0, color: null };
        }

        const default_stroke =
            layer.name == LayerNames.symbol_foreground
                ? this.theme.component_outline
                : this.theme.note;

        const color = this.dim_if_needed(item.stroke?.color ?? default_stroke);

        return { width, color };
    }

    protected determine_fill(
        layer: ViewLayer,
        item: schematic_items.GraphicItem,
    ) {
        const fill_type = item.fill?.type ?? "none";

        if (fill_type == "none") {
            return null;
        }

        if (
            fill_type == "background" &&
            layer.name != LayerNames.symbol_background
        ) {
            return null;
        }

        let color;

        switch (fill_type) {
            case "background":
                color = this.theme.component_body;
                break;
            case "outline":
                color = this.theme.component_outline;
                break;
            case "color":
                color = item.fill!.color;
                break;
        }

        return this.dim_if_needed(color);
    }
}
