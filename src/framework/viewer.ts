/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Viewport } from "../scene/viewport";
import { Renderer } from "../gfx/renderer";
import { Vec2 } from "../math/vec2";
import { BBox } from "../math/bbox";
import { Color } from "../gfx/color";
import { ViewLayerSet } from "./view-layers";
import { Polygon, Polyline } from "../gfx/shapes";

export abstract class Viewer extends EventTarget {
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    viewport: Viewport;
    layers: ViewLayerSet;
    #selected: BBox;

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.renderer = this.create_renderer(canvas);
    }

    abstract create_renderer(canvas: HTMLCanvasElement): Renderer;

    async setup() {
        await this.renderer.setup();

        this.viewport = new Viewport(this.renderer, () => {
            this.draw_soon();
        });

        this.viewport.enable_pan_and_zoom(0.3, 200);

        this.#setup_events();
    }

    #setup_events() {
        this.canvas.addEventListener("click", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouse = this.viewport.camera.screen_to_world(
                new Vec2(e.clientX - rect.left, e.clientY - rect.top)
            );

            this.selected = null;

            const items = this.layers.query_point(mouse);

            this.dispatchEvent(
                new CustomEvent("kicanvas:viewer:select", {
                    detail: {
                        mouse: mouse,
                        items: items,
                    },
                })
            );
        });
    }

    abstract load(url: string | URL): Promise<void>;

    protected abstract draw();

    draw_soon() {
        if (!this.viewport) {
            return;
        }

        window.requestAnimationFrame(() => {
            this.renderer.clear_canvas();
            this.draw();
        });
    }

    get selected() {
        return this.#selected;
    }

    set selected(bb: BBox) {
        this.#selected = bb?.copy();
        this.paint_selected();
    }

    get selection_color() {
        return Color.white;
    }

    paint_selected() {
        const layer = this.layers.by_name(":Overlay");

        layer.graphics?.clear();

        if (this.#selected) {
            const bb = this.#selected.copy().grow(this.#selected.w * 0.1);
            this.renderer.start_layer(layer.name, 1);

            this.renderer.line(
                Polyline.from_BBox(bb, 0.127, this.selection_color)
            );

            this.renderer.polygon(
                Polygon.from_BBox(bb, this.selection_color.with_alpha(0.4))
            );

            layer.graphics = this.renderer.end_layer();
        }

        this.draw_soon();
    }
}
