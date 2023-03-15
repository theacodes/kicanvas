/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { first } from "../../base/iterator";
import { BBox } from "../../base/math/bbox";
import { is_string } from "../../base/types";
import { Canvas2DRenderer } from "../../graphics/canvas2d/renderer";
import { Renderer } from "../../graphics/renderer";
import { KicadSch, SchematicSymbol } from "../../kicad/schematic";
import * as theme from "../../kicad/theme";
import { DocumentViewer } from "../base/document-viewer";
import { LayerSet } from "./layers";
import { SchematicPainter } from "./painter";

export class SchematicViewer extends DocumentViewer<
    KicadSch,
    SchematicPainter,
    LayerSet
> {
    get schematic(): KicadSch {
        return this.document;
    }

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new Canvas2DRenderer(canvas);
        renderer.theme = theme.schematic;
        renderer.state.fill = theme.schematic.note;
        renderer.state.stroke = theme.schematic.note;
        renderer.state.stroke_width = 0.1524;
        return renderer;
    }

    protected override create_painter() {
        return new SchematicPainter(this.renderer, this.layers);
    }

    protected override create_layer_set() {
        return new LayerSet(this.renderer.theme);
    }

    public override select(item: SchematicSymbol | string | BBox | null): void {
        // If item is a string, find the symbol by uuid or reference.
        if (is_string(item)) {
            item = this.schematic.find_symbol(item);
        }

        // If it's a symbol, find the bounding box for it.
        if (item instanceof SchematicSymbol) {
            const bboxes = this.layers.query_item_bboxes(item);
            item = first(bboxes) ?? null;
        }

        super.select(item);
    }
}
