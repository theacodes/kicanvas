/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { KicadSch } from "./items";
import { Canvas2DRenderer } from "../gfx/canvas2d/renderer";
import * as theme from "../kicad/theme";
import { Viewer } from "../framework/viewer";
import { Renderer } from "../gfx/renderer";
import { SchematicPainter } from "./painter";
import { LayerSet, ViewLayer } from "./layers";
import { BBox } from "../math/bbox";
import { Vec2 } from "../math/vec2";

export class SchematicViewer extends Viewer {
    schematic: KicadSch;
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

        this.schematic = new KicadSch(sch_text);

        if (this.layers) {
            this.layers.dispose();
        }

        this.layers = new LayerSet();
        this.#painter = new SchematicPainter(this.renderer, this.layers);

        this.#painter.paint(this.schematic);

        const bb = this.layers.bbox;
        this.viewport.camera.bbox = bb.grow(bb.w * 0.1);

        this.draw();
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
