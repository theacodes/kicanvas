/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color.js";
import { RenderLayer } from "../gfx/renderer.js";
import { BBox } from "../math/bbox.js";
import { Vec2 } from "../math/vec2.js";

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

type VisibilityType = boolean | (() => boolean);

/**
 * A view layer
 */
export class ViewLayer {
    #layer_set: ViewLayerSet;
    #visible: VisibilityType;
    name: string;

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
        color: Color = Color.white
    ) {
        this.#layer_set = layer_set;
        this.name = name;
        this.color = color;
        this.#visible = visible;
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
 * Represents the complete set of view layers.
 */
export class ViewLayerSet {
    #layer_list: ViewLayer[] = [];
    #layer_map: Map<string, ViewLayer> = new Map();

    /**
     * Create a new LayerSet
     */
    constructor() {}

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
     * @yields layers in the order they were added (front to back)
     */
    *in_order() {
        for (const layer of this.#layer_list) {
            yield layer;
        }
    }

    /**
     * @yields layers in the order they should be drawn (back to front)
     */
    *in_display_order() {
        for (let i = this.#layer_list.length - 1; i >= 0; i--) {
            yield this.#layer_list[i];
        }
    }

    /**
     * Gets a Layer by name
     */
    by_name(name: string): ViewLayer {
        return this.#layer_map.get(name);
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
}
