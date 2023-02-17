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
import * as events from "../framework/events";

export abstract class Viewer extends EventTarget {
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    viewport: Viewport;
    layers: ViewLayerSet;
    #selected: BBox | null;

    constructor(canvas: HTMLCanvasElement) {
        super();
        this.canvas = canvas;
        this.renderer = this.create_renderer(canvas);
    }

    dispose() {
        this.#selected = null;
        this.viewport.dispose();
        this.viewport = undefined!;
        this.layers.dispose();
        this.layers = undefined!;
        this.renderer.dispose();
        this.renderer = undefined!;
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
                new Vec2(e.clientX - rect.left, e.clientY - rect.top),
            );

            const items = this.layers.query_point(mouse);

            this.dispatchEvent(
                new CustomEvent(events.names.viewer.pick, {
                    detail: {
                        mouse: mouse,
                        items: items,
                    },
                }),
            );
        });
    }

    abstract load(url: string | URL | File): Promise<void>;

    protected draw() {
        if (!this.layers) {
            return;
        }

        this.renderer.clear_canvas();
        this.layers.render(this.viewport.camera.matrix);
    }

    draw_soon() {
        if (!this.viewport) {
            return;
        }

        window.requestAnimationFrame(() => {
            this.draw();
        });
    }

    get selected(): BBox | null {
        return this.#selected;
    }

    set selected(bb: BBox | null) {
        this.#selected = bb?.copy() || null;
        this.paint_selected();
    }

    get selection_color() {
        return Color.white;
    }

    paint_selected() {
        const layer = this.layers.by_name(":Overlay")!;

        layer.graphics?.clear();

        if (this.#selected) {
            const bb = this.#selected.copy().grow(this.#selected.w * 0.1);
            this.renderer.start_layer(layer.name, 1);

            this.renderer.line(
                Polyline.from_BBox(bb, 0.254, this.selection_color),
            );

            this.renderer.polygon(Polygon.from_BBox(bb, this.selection_color));

            layer.graphics = this.renderer.end_layer();

            layer.graphics.composite_operation = "overlay";
        }

        this.draw_soon();
    }
}
