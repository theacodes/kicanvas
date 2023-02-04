/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as sch_items from "../kicad/schematic";
import { Canvas2DRenderer } from "../gfx/canvas2d/renderer";
import * as theme from "../kicad/theme";
import { Viewer } from "../framework/viewer";
import { Renderer } from "../gfx/renderer";
import { SchematicPainter } from "./painter";
import { LayerSet } from "./layers";
import { Color } from "../gfx/color";

export class SchematicViewer extends Viewer {
    schematic: sch_items.KicadSch;
    #painter: SchematicPainter;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);

        this.addEventListener("kicanvas:viewer:select", (e: Event) => {
            const { mouse: _, items } = (e as CustomEvent).detail;

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
                    }),
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

    override async load(src: string | URL | File) {
        let sch_text;
        if (src instanceof File) {
            sch_text = await src.text();
        } else {
            sch_text = await (await window.fetch(src)).text();
        }

        this.schematic = new sch_items.KicadSch(sch_text);

        if (this.layers) {
            this.layers.dispose();
        }

        this.layers = new LayerSet();
        this.#painter = new SchematicPainter(this.renderer, this.layers);

        this.#painter.paint(this.schematic);

        this.#look_at_schematic();
        this.draw_soon();
    }

    #look_at_schematic() {
        const bb = this.layers.bbox;
        this.viewport.camera.bbox = bb.grow(bb.w * 0.1);
    }

    override get selection_color(): Color {
        return theme.schematic.shadow;
    }
}
