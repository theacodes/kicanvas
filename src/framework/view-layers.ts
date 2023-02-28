/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color";
import { RenderLayer } from "../gfx/renderer";
import { BBox } from "../math/bbox";
import { Matrix3 } from "../math/matrix3";
import { Vec2 } from "../math/vec2";

/**
 * View layers
 *
 * KiCanvas's structure uses view layers to gather schematic or board items.
 * These view layers are used render parts of each item in the correct order
 * (back to front) as well as provide bounding box queries.
 *
 * For the board viewer, some layers correspond to physical board layers
 * (like F.Cu, F.SilkS, & so on) but many are "virtual". The schematic viewer
 * uses layers as well but largely to get the correct rendering order.
 */

export type VisibilityType = boolean | (() => boolean);

/**
 * A view layer
 */
export class ViewLayer {
    layer_set: ViewLayerSet;
    name: string;
    highlighted = false;
    #visible: VisibilityType;

    /**
     * The layer color can be used by Painters as a default or fallback color
     * for items.
     */
    color: Color;

    /**
     * Board or schematic items on this layer.
     */
    items: any[];

    /**
     * This stores all of the graphics created by painters for items on this layer.
     * */
    graphics: RenderLayer;

    /** A map of board items to bounding boxes
     * A board item can have graphics on multiple layers, the bounding box provided
     * here is only valid for this layer.
     */
    bboxes: Map<any, BBox> = new Map();

    /**
     * Create a new Layer.
     * @param  ayer_set - the LayerSet that this Layer belongs to
     * @param name - this layer's name
     * @param visible - controls whether the layer is visible when rendering, may be a function returning a boolean.
     */
    constructor(
        layer_set: ViewLayerSet,
        name: string,
        visible: VisibilityType = true,
        color: Color = Color.white,
    ) {
        this.layer_set = layer_set;
        this.name = name;
        this.color = color;
        this.#visible = visible;
        this.items = [];
    }

    dispose() {
        this.graphics?.dispose();
    }

    clear() {
        this.graphics?.dispose();
        this.items = [];
    }

    get visible(): boolean {
        if (this.#visible instanceof Function) {
            return this.#visible();
        } else {
            return this.#visible;
        }
    }

    set visible(v: VisibilityType) {
        this.#visible = v;
    }

    /** The overall bounding box of all items on this layer */
    get bbox() {
        return BBox.combine(this.bboxes.values());
    }

    /** @yields a list of BBoxes that contain the given point */
    *query_point(p: Vec2) {
        for (const bb of this.bboxes.values()) {
            if (bb.contains_point(p)) {
                yield bb;
            }
        }
    }
}

/**
 * Common view layer names across all viewers.
 */
export enum ViewLayerName {
    overlay = ":Overlay",
    grid = ":Grid",
    drawing_sheet = ":DrawingSheet",
}

/**
 * Represents the complete set of view layers.
 */
export class ViewLayerSet {
    #layer_list: ViewLayer[] = [];
    #layer_map: Map<string, ViewLayer> = new Map();
    #overlay: ViewLayer;

    /**
     * Create a new LayerSet
     */
    constructor() {
        this.#overlay = new ViewLayer(
            this,
            ViewLayerName.overlay,
            true,
            Color.white,
        );
    }

    /**
     * Dispose of any resources held by layers
     */
    dispose() {
        this.#overlay.dispose();
        for (const layer of this.#layer_list) {
            layer.dispose();
        }
        this.#layer_list = undefined!;
        this.#layer_map = undefined!;
    }

    /**
     * Adds layers to the set. Layers should be added front to back.
     */
    add(...layers: ViewLayer[]) {
        for (const layer of layers) {
            this.#layer_list.push(layer);
            this.#layer_map.set(layer.name, layer);
        }
    }

    /**
     * Renders all the layers in the set in display order (back to front)
     */
    render(camera: Matrix3) {
        let depth = 0.01;
        const should_dim = this.is_any_layer_highlighted();

        for (const layer of this.in_display_order()) {
            if (layer.visible && layer.graphics) {
                let alpha = 1;

                if (should_dim && !layer.highlighted) {
                    alpha = 0.25;
                }

                layer.graphics.render(camera, depth, alpha);
                depth += 0.01;
            }
        }
    }

    /**
     * @yields layers in the order they were added (front to back), does not
     * include the overlay layer.
     */
    *in_order() {
        for (const layer of this.#layer_list) {
            yield layer;
        }
    }

    /**
     * @yields layers in the order they should be drawn (back to front),
     * including the overlay layer.
     */
    *in_display_order() {
        for (let i = this.#layer_list.length - 1; i >= 0; i--) {
            const layer = this.#layer_list[i]!;

            if (!layer.highlighted) {
                yield layer;
            }
        }

        // Go back through the layers and yield the highlighted ones. These
        // are drawn after regular layers.
        for (let i = this.#layer_list.length - 1; i >= 0; i--) {
            const layer = this.#layer_list[i]!;

            if (layer.highlighted) {
                yield layer;
            }
        }

        yield this.#overlay;
    }

    /**
     * Gets a Layer by name
     */
    by_name(name: string): ViewLayer | undefined {
        return this.#layer_map.get(name);
    }

    /**
     * Returns all layers that "match" the given pattern.
     */
    *query(predicate: (l: ViewLayer) => boolean) {
        for (const l of this.#layer_list) {
            if (predicate(l)) {
                yield l;
            }
        }
    }

    /**
     * Gets the special overlay layer, which is always visible and always
     * drawn above all others.
     */
    get overlay() {
        return this.#overlay;
    }

    /**
     * Highlights the given layer(s), by default they're drawn above other layers.
     */
    highlight(
        layer_or_layers:
            | string
            | ViewLayer
            | null
            | Iterable<string | ViewLayer>,
    ) {
        let layer_names: string[];

        if (layer_or_layers instanceof ViewLayer) {
            layer_names = [layer_or_layers.name];
        } else if (typeof layer_or_layers == "string") {
            layer_names = [layer_or_layers];
        } else if (!layer_or_layers) {
            layer_names = [];
        } else {
            layer_names = Array.from(layer_or_layers).map((v) =>
                v instanceof ViewLayer ? v.name : v,
            );
        }

        for (const l of this.#layer_list) {
            if (layer_names.includes(l.name)) {
                l.highlighted = true;
            } else {
                l.highlighted = false;
            }
        }
    }

    is_any_layer_highlighted() {
        for (const l of this.#layer_list) {
            if (l.highlighted) {
                return true;
            }
        }
        return false;
    }

    /**
     * @yields a list of interactive layers
     */
    *interactive_layers() {
        for (const layer of this.in_order()) {
            if (layer.visible) {
                yield layer;
            }
        }
    }

    /**
     * @yields layers and bounding boxes that contain the given point.
     */
    *query_point(p: Vec2) {
        for (const layer of this.interactive_layers()) {
            for (const bbox of layer.query_point(p)) {
                yield { layer, bbox };
            }
        }
    }

    /**
     * @return a bounding box encompassing all elements from all layers.
     */
    get bbox() {
        const bboxes: BBox[] = [];
        for (const layer of this.in_order()) {
            bboxes.push(layer.bbox);
        }

        return BBox.combine(bboxes);
    }
}
