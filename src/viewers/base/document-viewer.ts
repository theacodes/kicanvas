/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox, Vec2 } from "../../base/math";
import { DrawingSheet, type DrawingSheetDocument } from "../../kicad";
import { DrawingSheetPainter } from "../drawing-sheet/painter";
import { Grid } from "./grid";
import type { DocumentPainter, PaintableDocument } from "./painter";
import { ViewLayerNames, type ViewLayerSet } from "./view-layers";
import { Viewer } from "./viewer";

type ViewableDocument = DrawingSheetDocument & PaintableDocument;

export abstract class DocumentViewer<
    DocumentT extends ViewableDocument,
    PainterT extends DocumentPainter,
    ViewLayerSetT extends ViewLayerSet,
> extends Viewer {
    public document: DocumentT;
    public drawing_sheet: DrawingSheet;
    public declare layers: ViewLayerSetT;

    protected painter: PainterT;
    protected grid: Grid;

    protected abstract create_painter(): PainterT;
    protected abstract create_layer_set(): ViewLayerSetT;
    protected get grid_origin(): Vec2 {
        return new Vec2(0, 0);
    }

    override async load(src: DocumentT) {
        if (this.document == src) {
            return;
        }

        this.document = src;

        // Load the default drawing sheet.
        this.drawing_sheet = DrawingSheet.default();
        this.drawing_sheet.document = this.document;

        // Setup graphical layers
        this.disposables.disposeAndRemove(this.layers);
        this.layers = this.disposables.add(this.create_layer_set());

        // Paint the board
        this.painter = this.create_painter();
        this.painter.paint(this.document);

        // Paint the drawing sheet
        new DrawingSheetPainter(this.renderer, this.layers).paint(
            this.drawing_sheet,
        );

        // Create the grid
        this.grid = new Grid(
            this.renderer,
            this.viewport.camera,
            this.layers.by_name(ViewLayerNames.grid)!,
            this.grid_origin,
        );

        // Wait for a valid viewport size
        await this.viewport.ready;
        this.viewport.bounds = this.drawing_sheet.page_bbox.grow(50);

        // Position the camera and draw the scene.
        this.zoom_to_page();

        // Mark the viewer as loaded and notify event listeners
        this.resolve_loaded(true);
    }

    protected override on_viewport_change(): void {
        super.on_viewport_change();
        this.grid?.update();
    }

    override zoom_to_page() {
        this.viewport.camera.bbox = this.drawing_sheet.page_bbox.grow(10);
        this.draw();
    }

    public override select(item: BBox | null): void {
        // If value wasn't explicitly null and no item was found, give up.
        if (item != null && !(item instanceof BBox)) {
            console.log(item);
            throw new Error(
                `Unable to select item ${item}, could not find an object that matched.`,
            );
        }

        this.selected = item ?? null;
    }
}
