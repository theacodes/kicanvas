/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "../kicad/parser";
import * as sch_items from "../kicad/schematic";
import { Canvas2DRenderer } from "../gfx/canvas2d/renderer";
import * as theme from "../kicad/theme";
import { Viewer } from "../framework/viewer";
import { Renderer } from "../gfx/renderer";
import { SchematicPainter } from "./painter";
import { LayerName, LayerSet } from "./layers";
import { Color } from "../gfx/color";

export class SchematicViewer extends Viewer {
    schematic: sch_items.KicadSch;
    #painter: SchematicPainter;

    constructor(canvas) {
        super(canvas);

        this.addEventListener("kicanvas:viewer:select", (e: CustomEvent) => {
            const { mouse: _, items } = e.detail;

            for (const { layer: _, bbox } of items) {
                this.selected = bbox;
                break;
            }

            if (this.selected) {
                canvas.dispatchEvent(
                    new CustomEvent("kicad-schematic:item-selected", {
                        bubbles: true,
                        composed: true,
                        detail: this.selected
                            .context as sch_items.SymbolInstance,
                    })
                );
            }
        });
    }

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new Canvas2DRenderer(canvas);
        renderer.theme = theme.schematic;
        renderer.state.fill = theme.schematic.note;
        renderer.state.stroke = theme.schematic.note;
        renderer.state.stroke_width = 0.1524;
        return renderer;
    }

    override async load(url: string | URL) {
        const sch_src = await (await window.fetch(url)).text();
        this.schematic = new sch_items.KicadSch(parse(sch_src));

        this.layers = new LayerSet();
        this.#painter = new SchematicPainter(this.renderer, this.layers);

        this.#painter.paint(this.schematic);

        this.#look_at_schematic();
        this.draw_soon();
    }

    #look_at_schematic() {
        const interactive = this.layers.by_name(LayerName.interactive);
        const bb = interactive.bbox;
        this.viewport.camera.bbox = bb.grow(bb.w * 0.1);
    }

    override get selection_color(): Color {
        return theme.schematic.shadow;
    }
}
