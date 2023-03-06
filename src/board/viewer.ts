/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { DrawingSheet } from "../drawing_sheet/items";
import { DrawingSheetPainter } from "../drawing_sheet/painter";
import { Viewer } from "../framework/viewer";
import { Renderer } from "../gfx/renderer";
import { WebGL2Renderer } from "../gfx/webgl/renderer";
import * as theme from "../kicad/theme";
import { BBox } from "../math/bbox";
import { Vec2 } from "../math/vec2";
import * as board_items from "./items";
import { LayerNames, LayerSet, ViewLayer } from "./layers";
import { BoardPainter } from "./painter";

export class BoardViewer extends Viewer {
    board: board_items.KicadPCB;
    drawing_sheet: DrawingSheet;
    #painter: BoardPainter;

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new WebGL2Renderer(canvas);
        renderer.theme = theme.board;
        return renderer;
    }

    override async load(src: string | URL | File) {
        let pcb_text;
        if (src instanceof File) {
            pcb_text = await src.text();
        } else {
            pcb_text = await (await window.fetch(src)).text();
        }

        // Parse the board and load the default drawing sheet.
        this.board = new board_items.KicadPCB(pcb_text);
        this.drawing_sheet = DrawingSheet.default();
        this.drawing_sheet.document = this.board;

        // Setup graphical layers
        this.layers = new LayerSet(this.board, this.renderer.theme);

        // Paint the board
        this.#painter = new BoardPainter(
            this.renderer,
            this.layers as LayerSet,
        );
        this.#painter.paint(this.board);

        // Paint the drawing sheet
        new DrawingSheetPainter(this.renderer, this.layers as LayerSet).paint(
            this.drawing_sheet,
        );

        // Position the camera and draw the scene.
        this.look_at_sheet();
        this.draw();

        // Mark the viewer as loaded and notify event listeners
        this.set_loaded(true);
    }

    protected override on_pick(
        mouse: Vec2,
        items: Generator<{ layer: ViewLayer; bbox: BBox }, void, unknown>,
    ): void {
        let selected = null;

        for (const { layer: _, bbox } of items) {
            if (bbox.context instanceof board_items.Footprint) {
                // use the nominal footprint bbox, since this bbox may
                // just be from a pad or something.
                selected = bbox.context.bbox;
                break;
            }
        }

        this.select(selected);
    }

    override select(value: board_items.Footprint | string | BBox | null) {
        let item = value;

        // If item is a string, find the footprint by uuid or reference.
        if (typeof item == "string") {
            item = this.board.find_footprint(item);
        }

        // If it's a footprint, use the footprint's nominal bounding box.
        if (item instanceof board_items.Footprint) {
            item = item.bbox;
        }

        // If value wasn't explicitly null and none of the above found a suitable
        // selection, give up.
        if (value != null && !(item instanceof BBox)) {
            throw new Error(
                `Unable to select item ${value}, could not find an object that matched.`,
            );
        }

        this.selected = item ?? null;
    }

    highlight_net(net: number) {
        this.#painter.paint_net(this.board, net);
        this.draw();
    }

    private set_layers_opacity(layers: Generator<ViewLayer>, opacity: number) {
        for (const layer of layers) {
            layer.opacity = opacity;
        }
        this.draw();
    }

    set track_opacity(value: number) {
        this.set_layers_opacity(
            (this.layers as LayerSet).copper_layers(),
            value,
        );
    }

    set via_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).via_layers(), value);
    }

    set zone_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).zone_layers(), value);
    }

    set pad_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).pad_layers(), value);
    }

    set pad_hole_opacity(value: number) {
        this.set_layers_opacity(
            (this.layers as LayerSet).pad_hole_layers(),
            value,
        );
    }

    set grid_opacity(value: number) {
        this.set_layers_opacity((this.layers as LayerSet).grid_layers(), value);
    }

    set page_opacity(value: number) {
        this.layers.by_name(LayerNames.drawing_sheet)!.opacity = value;
        this.draw();
    }

    look_at_sheet() {
        this.viewport.camera.bbox = this.drawing_sheet.page_bbox.grow(10);
    }

    look_at_board() {
        const edge_cuts = this.layers.by_name(LayerNames.edge_cuts)!;
        const board_bbox = edge_cuts.bbox;
        this.viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
    }
}
