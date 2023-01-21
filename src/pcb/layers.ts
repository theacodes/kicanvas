/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color.js";
import { PrimitiveSet } from "../gfx/primitives.js";
import { BBox } from "../math/bbox.js";

type VisibilityType = boolean | (() => boolean);

/**
 * A graphical layer
 *
 * Graphical layers are responsible for tying the basic board data to graphics
 * generated using Painters.
 */
export class Layer {
    #layer_set: LayerSet;
    name: string;
    #visible: VisibilityType;
    enabled: boolean;
    color: Color;

    /**
     * Board items on this layer.
     */
    items: any[];

    /**
     * The renderer-generated graphics for items on this layer.
     * */
    graphics: PrimitiveSet;

    /** A map of board items to bounding boxes
     * A board item can have graphics on multiple layers, the bounding box provided
     * here is only valid for this layer.
     */
    bboxes: Map<any, BBox> = new Map();

    /**
     * Create a new Layer.
     * @param  layer_set - the LayerSet that this Layer belongs to
     * @param name - this layer's name
     * @param visible - controls whether the layer is visible when rendering, may be a function returning a boolean.
     * @param enabled - controls whether the layer is present at all in the board data
     */
    constructor(
        layer_set: LayerSet,
        name: string,
        visible: VisibilityType = true,
        enabled = true
    ) {
        this.#layer_set = layer_set;
        this.name = name;
        this.color = this.#layer_set.color_for(this.name);
        this.#visible = visible;
        this.enabled = enabled;
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
}

const max_inner_copper_layers = 30;

/**
 * Represents the complete set of layers used by a View to draw a board.
 *
 * There are graphical layers that correspond to respective board layers, but
 * there are also several graphical layers that are "virtual", such as layers
 * for drill holes and such.
 */
export class LayerSet {
    #color_theme: any;
    #layer_list: Layer[] = [];
    #layer_map: Map<string, Layer> = new Map();

    /**
     * Create a new LayerSet
     */
    constructor(color_theme) {
        this.#color_theme = color_theme;

        this.#layer_list = [
            new Layer(this, ":Overlay"),

            new Layer(this, "Dwgs.User"),
            new Layer(this, "Cmts.User"),
            new Layer(this, "Eco1.User"),
            new Layer(this, "Eco2.User"),
            new Layer(this, "Edge.Cuts"),
            new Layer(this, "Margin"),

            new Layer(this, "User.1", true, false),
            new Layer(this, "User.2", true, false),
            new Layer(this, "User.3", true, false),
            new Layer(this, "User.4", true, false),
            new Layer(this, "User.5", true, false),
            new Layer(this, "User.6", true, false),
            new Layer(this, "User.7", true, false),
            new Layer(this, "User.8", true, false),
            new Layer(this, "User.9", true, false),

            new Layer(this, ":Anchors"),

            new Layer(this, ":Via:Holes", () =>
                this.is_any_copper_layer_visible()
            ),
            new Layer(this, ":Pad:Holes", () =>
                this.is_any_copper_layer_visible()
            ),
            new Layer(this, ":Pad:HoleWalls", () =>
                this.is_any_copper_layer_visible()
            ),
            new Layer(this, ":Via:Through", () =>
                this.is_any_copper_layer_visible()
            ),
            new Layer(this, ":Via:BuriedBlind", () =>
                this.is_any_copper_layer_visible()
            ),
            new Layer(this, ":Via:MicroVia", () =>
                this.is_any_copper_layer_visible()
            ),

            new Layer(this, ":Pads:Front", () => this.by_name("F.Cu").visible),
            new Layer(this, "F.Cu"),
            new Layer(this, ":Zones:F.Cu", () => this.by_name("F.Cu").visible),
            new Layer(this, "F.Mask"),
            new Layer(this, "F.SilkS"),
            new Layer(this, "F.Adhes"),
            new Layer(this, "F.Paste"),
            new Layer(this, "F.CrtYd"),
            new Layer(this, "F.Fab"),
        ];

        for (let i = 1; i <= max_inner_copper_layers; i++) {
            const name = `In${i}.Cu`;
            this.#layer_list.push(new Layer(this, name, false, false));
            this.#layer_list.push(
                new Layer(
                    this,
                    `:Zones:${name}`,
                    () => this.by_name(name).visible
                )
            );
        }

        this.#layer_list = this.#layer_list.concat([
            new Layer(this, ":Pads:Back", () => this.by_name("B.Cu").visible),
            new Layer(this, "B.Cu"),
            new Layer(this, ":Zones:B.Cu", () => this.by_name("B.Cu").visible),
            new Layer(this, "B.Mask"),
            new Layer(this, "B.SilkS"),
            new Layer(this, "B.Adhes"),
            new Layer(this, "B.Paste"),
            new Layer(this, "B.CrtYd"),
            new Layer(this, "B.Fab"),
        ]);

        for (const l of this.#layer_list) {
            this.#layer_map.set(l.name, l);
        }
    }

    /**
     * Get the theme color for a given layer.

     */
    color_for(layer_name: string): Color {
        switch (layer_name) {
            case ":Via:Holes":
                return this.#color_theme.via_hole;
            case ":Via:Through":
                return this.#color_theme.via_through;
            case ":Pad:Holes":
                return this.#color_theme.background;
            case ":Pad:HoleWalls":
                return this.#color_theme.pad_through_hole;
        }

        let name = layer_name;

        name = (name
            .replace(":Zones:", "")
            .replace(".", "_")
            .toLowerCase());

        if (name.endsWith("_cu")) {
            name = name.replace("_cu", "");
            return this.#color_theme.copper[name];
        }

        return this.#color_theme[name] ?? new Color(1, 0, 0, 1);
    }

    /**
     * @yields layers in the order they should be drawn
     */
    *in_display_order() {
        for (const layer of this.#layer_list) {
            yield layer;
        }
    }

    /**
     * @yields layers that coorespond to board layers that should be
     *      displayed in the layer selection UI
     */
    *in_ui_order() {
        const inner_copper = Symbol("inner_copper");

        const order = [
            "F.Cu",
            inner_copper,
            "B.Cu",
            "F.Adhes",
            "B.Adhes",
            "F.Paste",
            "B.Paste",
            "F.SilkS",
            "B.SilkS",
            "F.Mask",
            "B.Mask",
            "Dwgs.User",
            "Cmts.User",
            "Eco1.User",
            "Eco2.User",
            "Edge.Cuts",
            "Margin",
            "F.CrtYd",
            "B.CrtYd",
            "F.Fab",
            "B.Fab",
            "User.1",
            "User.2",
            "User.3",
            "User.4",
            "User.5",
            "User.6",
            "User.7",
            "User.8",
            "User.9",
        ];

        for (const name of order) {
            if (name == inner_copper) {
                for (let i = 1; i <= max_inner_copper_layers; i++) {
                    const layer = this.by_name(`In${i}.Cu`);
                    if (layer.enabled) {
                        yield layer;
                    }
                }
            } else {
                const layer: Layer = this.by_name(name as string);

                if (layer.enabled) {
                    yield layer;
                }
            }
        }
    }

    /**
     * Gets a Layer by name
     */
    by_name(name: string): Layer {
        return this.#layer_map.get(name);
    }

    /**
     * @returns true if any copper layer is enabled and visible.
     */
    is_any_copper_layer_visible(): boolean {
        for (const l of this.in_display_order()) {
            if (l.name.endsWith(".Cu") && l.enabled && l.visible) {
                return true;
            }
        }
        return false;
    }
}
