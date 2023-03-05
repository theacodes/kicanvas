/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DrawingSheet } from "../drawing_sheet/items";
import { Viewer } from "../framework/viewer";
import { Canvas2DRenderer } from "../gfx/canvas2d/renderer";
import { Renderer } from "../gfx/renderer";
import * as theme from "../kicad/theme";
import { BBox } from "../math/bbox";
import { Vec2 } from "../math/vec2";
import { KicadSch } from "./items";
import { LayerSet, ViewLayer } from "./layers";
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
        if (src instanceof File) {
            sch_text = await src.text();
        } else {
            sch_text = await (await window.fetch(src)).text();
        }

        // Parse the schematic and load the default drawing sheet
        this.schematic = new KicadSch(sch_text);
        this.drawing_sheet = DrawingSheet.default();
        //this.drawing_sheet.document = this.schematic;

        if (this.layers) {
            this.layers.dispose();
        }

        // Setup graphical layers
        this.layers = new LayerSet();

        // Paint the schematic
        this.#painter = new SchematicPainter(this.renderer, this.layers);
        this.#painter.paint(this.schematic);

        // Paint the drawing sheet
        // new DrawingSheetPainter(this.renderer, this.layers as LayerSet).paint(
        //     this.drawing_sheet,
        // );

        const bb = this.layers.bbox;
        this.viewport.camera.bbox = bb.grow(bb.w * 0.1);

        this.draw();

        // Mark the viewer as loaded and notify event listeners
        this.set_loaded(true);
    }

    protected override on_pick(
        mouse: Vec2,
        items: Generator<{ layer: ViewLayer; bbox: BBox }, void, unknown>,
    ): void {
        let selected = null;

        for (const { bbox } of items) {
            selected = bbox;
            break;
        }

        this.selected = selected;
    }
}
