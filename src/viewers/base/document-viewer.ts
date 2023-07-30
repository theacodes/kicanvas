/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox, Vec2 } from "../../base/math";
import * as log from "../../base/log";
import {
    DrawingSheet,
    type DrawingSheetDocument,
    type BaseTheme,
} from "../../kicad";
import { DrawingSheetPainter } from "../drawing-sheet/painter";
import { Grid } from "./grid";
import type { DocumentPainter, PaintableDocument } from "./painter";
import { ViewLayerNames, type ViewLayerSet } from "./view-layers";
import { Viewer } from "./viewer";

type ViewableDocument = DrawingSheetDocument &
    PaintableDocument & { filename: string };

export abstract class DocumentViewer<
    DocumentT extends ViewableDocument,
    PainterT extends DocumentPainter,
    ViewLayerSetT extends ViewLayerSet,
    ThemeT extends BaseTheme,
> extends Viewer {
    public document: DocumentT;
    public drawing_sheet: DrawingSheet;
    public declare layers: ViewLayerSetT;
    public theme: ThemeT;

    protected painter: PainterT;
    protected grid: Grid;

    constructor(canvas: HTMLCanvasElement, theme: ThemeT) {
        super(canvas);
        this.theme = theme;
    }

    protected abstract create_painter(): PainterT;
    protected abstract create_layer_set(): ViewLayerSetT;
    protected get grid_origin(): Vec2 {
        return new Vec2(0, 0);
    }

    override async load(src: DocumentT) {
        if (this.document == src) {
            return;
        }

        log.start(`Loading ${src.filename} into viewer`);

        this.document = src;
        this.paint();

        // Wait for a valid viewport size
        log.message("Waiting for viewport");
        await this.viewport.ready;
        this.viewport.bounds = this.drawing_sheet.page_bbox.grow(50);

        // Position the camera and draw the scene.
        log.message("Positioning camera");
        this.zoom_to_page();

        // Mark the viewer as loaded and notify event listeners
        this.resolve_loaded(true);

        // Deselect any selected items.
        if (this.selected) {
            this.selected = null;
        }

        // Draw
        this.draw();

        log.finish();
    }

    public paint() {
        if (!this.document) {
            return;
        }

        // Update the renderer's background color to match the theme.
        this.renderer.background_color = this.theme.background;

        // Load the default drawing sheet.
        log.message("Loading drawing sheet");
        if (!this.drawing_sheet) {
            this.drawing_sheet = DrawingSheet.default();
        }
        this.drawing_sheet.document = this.document;

        // Setup graphical layers
        log.message("Creating layers");
        this.disposables.disposeAndRemove(this.layers);
        this.layers = this.disposables.add(this.create_layer_set());

        // Paint the board
        log.message("Painting items");
        this.painter = this.create_painter();
        this.painter.paint(this.document);

        // Paint the drawing sheet
        log.message("Painting drawing sheet");
        new DrawingSheetPainter(this.renderer, this.layers, this.theme).paint(
            this.drawing_sheet,
        );

        // Create the grid
        log.message("Painting grid");
        this.grid = new Grid(
            this.renderer,
            this.viewport.camera,
            this.layers.by_name(ViewLayerNames.grid)!,
            this.grid_origin,
            this.theme.grid,
            this.theme.grid_axes,
        );
    }

    public override zoom_to_page() {
        this.viewport.camera.bbox = this.drawing_sheet.page_bbox.grow(10);
        this.draw();
    }

    public override draw(): void {
        if (!this.viewport) {
            return;
        }

        this.grid?.update();

        super.draw();
    }

    public override select(item: BBox | null): void {
        // If value wasn't explicitly null and no item was found, give up.
        if (item != null && !(item instanceof BBox)) {
            throw new Error(
                `Unable to select item ${item}, could not find an object that matched.`,
            );
        }

        this.selected = item ?? null;
    }
}
