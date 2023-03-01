/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as board_items from "./items";
import { WebGL2Renderer } from "../gfx/webgl/renderer";
import * as theme from "../kicad/theme";
import { Viewer } from "../framework/viewer";
import { Renderer } from "../gfx/renderer";
import { BoardPainter } from "./painter";
import { LayerNames, LayerSet } from "./layers";
import { Color } from "../gfx/color";
import { KiCanvasPickEvent, KiCanvasSelectEvent } from "../framework/events";
import { DrawingSheet } from "../drawing_sheet/items";
import { DrawingSheetPainter } from "../drawing_sheet/painter";

export class BoardViewer extends Viewer {
    board: board_items.KicadPCB;
    drawing_sheet: DrawingSheet;
    #painter: BoardPainter;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);

        this.addEventListener(
            KiCanvasPickEvent.type,
            (e: KiCanvasPickEvent) => {
                const { mouse: _, items } = (e as CustomEvent).detail;

                let selected;

                for (const { layer: _, bbox } of items) {
                    if (bbox.context instanceof board_items.Footprint) {
                        selected = bbox;
                        break;
                    }
                }

                if (!selected || selected.context == this.selected?.context) {
                    // selecting the same thing twice deselects it.
                    selected = null;
                }

                if (selected) {
                    canvas.dispatchEvent(
                        new KiCanvasSelectEvent({
                            item: selected.context,
                        }),
                    );
                }

                this.selected = selected;
            },
        );
    }

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

        this.board = new board_items.KicadPCB(pcb_text);

        this.layers = new LayerSet(this.board, this.renderer.theme);
        this.#painter = new BoardPainter(
            this.renderer,
            this.layers as LayerSet,
        );

        this.#painter.paint(this.board);

        this.drawing_sheet = DrawingSheet.default();
        this.drawing_sheet.document = this.board;

        new DrawingSheetPainter(this.renderer, this.layers as LayerSet).paint(
            this.drawing_sheet,
        );

        this.look_at_sheet();
        this.draw_soon();
    }

    look_at_sheet() {
        this.viewport.camera.bbox = this.drawing_sheet.bbox.grow(10);
    }

    look_at_board() {
        const edge_cuts = this.layers.by_name(LayerNames.edge_cuts)!;
        const board_bbox = edge_cuts.bbox;
        this.viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
    }

    override get selection_color() {
        return Color.white;
    }
}
