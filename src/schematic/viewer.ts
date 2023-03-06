/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DrawingSheet } from "../drawing_sheet/items";
import { DrawingSheetPainter } from "../drawing_sheet/painter";
import { Viewer } from "../framework/viewer";
import { Canvas2DRenderer } from "../gfx/canvas2d/renderer";
import { Renderer } from "../gfx/renderer";
import * as theme from "../kicad/theme";
import { BBox } from "../math/bbox";
import { KicadSch, SchematicSymbol } from "./items";
import { LayerSet } from "./layers";
import { SchematicPainter } from "./painter";

export class SchematicViewer extends Viewer {
    schematic: KicadSch;
    drawing_sheet: DrawingSheet;
    #painter: SchematicPainter;

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new Canvas2DRenderer(canvas);
        renderer.theme = theme.schematic;
        renderer.state.fill = theme.schematic.note;
        renderer.state.stroke = theme.schematic.note;
        renderer.state.stroke_width = 0.1524;
        return renderer;
    }

    override async load(src: string | URL | File) {
        let sch_text;
        let sch_filename;
        if (src instanceof File) {
            sch_text = await src.text();
            sch_filename = src.name;
        } else {
            sch_text = await (await window.fetch(src)).text();
            sch_filename =
                new URL(src).pathname.split("/").at(-1) ?? "unknown.kicad_sch";
        }

        // Parse the schematic and load the default drawing sheet
        this.schematic = new KicadSch(sch_filename, sch_text);
        this.drawing_sheet = DrawingSheet.default();
        this.drawing_sheet.document = this.schematic;

        if (this.layers) {
            this.layers.dispose();
        }

        // Setup graphical layers
        this.layers = new LayerSet(this.renderer.theme);

        // Paint the schematic
        this.#painter = new SchematicPainter(
            this.renderer,
            this.layers as LayerSet,
        );
        this.#painter.paint(this.schematic);

        // Paint the drawing sheet
        new DrawingSheetPainter(this.renderer, this.layers as LayerSet).paint(
            this.drawing_sheet,
        );

        const bb = this.layers.bbox;
        this.viewport.camera.bbox = bb.grow(bb.w * 0.1);

        this.draw();

        // Mark the viewer as loaded and notify event listeners
        this.set_loaded(true);
    }

    public override select(
        value: SchematicSymbol | string | BBox | null,
    ): void {
        let item = value;

        // If item is a string, find the symbol by uuid or reference.
        if (typeof item == "string") {
            item = this.schematic.find_symbol(item);
        }

        // If it's a symbol, find the bounding box for it.
        if (item instanceof SchematicSymbol) {
            const bboxes = this.layers.query_item_bboxes(item);
            item = bboxes.next().value ?? null;
        }

        // If value wasn't explicitly null and none of the above found a suitable
        // selection, give up.
        if (value != null && !(item instanceof BBox)) {
            console.log(value, item);
            throw new Error(
                `Unable to select item ${value}, could not find an object that matched.`,
            );
        }

        this.selected = item ?? null;
    }
}
