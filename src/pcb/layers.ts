/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color";
import {
    type VisibilityType,
    ViewLayer,
    ViewLayerSet as BaseLayerSet,
} from "../framework/view-layers";
import { KicadPCB } from "../kicad/board";
export { ViewLayer };

/** Board view layer names
 *
 * There are view layers that correspond to respective board layers, but
 * there are also several graphical layers that are "virtual", such as layers
 * for drill holes and such.
 */
export enum LayerName {
    overlay = ":Overlay",
    dwgs_user = "Dwgs.User",
    cmts_user = "Cmts.User",
    eco1_user = "Eco1.User",
    eco2_user = "Eco2.User",
    edge_cuts = "Edge.Cuts",
    margin = "Margin",
    user_1 = "User.1",
    user_2 = "User.2",
    user_3 = "User.3",
    user_4 = "User.4",
    user_5 = "User.5",
    user_6 = "User.6",
    user_7 = "User.7",
    user_8 = "User.8",
    user_9 = "User.9",
    anchors = ":Anchors",
    via_holes = ":Via:Holes",
    pad_holes = ":Pad:Holes",
    pad_holewalls = ":Pad:HoleWalls",
    via_through = ":Via:Through",
    via_buriedblind = ":Via:BuriedBlind",
    via_microvia = ":Via:MicroVia",
    pads_front = ":Pads:Front",
    f_cu = "F.Cu",
    zones_f_cu = ":Zones:F.Cu",
    f_mask = "F.Mask",
    f_silks = "F.SilkS",
    f_adhes = "F.Adhes",
    f_paste = "F.Paste",
    f_crtyd = "F.CrtYd",
    f_fab = "F.Fab",
    in1_cu = "In1.Cu",
    zones_in1_cu = ":Zones:In1.Cu",
    in2_cu = "In2.Cu",
    zones_in2_cu = ":Zones:In2.Cu",
    in3_cu = "In3.Cu",
    zones_in3_cu = ":Zones:In3.Cu",
    in4_cu = "In4.Cu",
    zones_in4_cu = ":Zones:In4.Cu",
    in5_cu = "In5.Cu",
    zones_in5_cu = ":Zones:In5.Cu",
    in6_cu = "In6.Cu",
    zones_in6_cu = ":Zones:In6.Cu",
    in7_cu = "In7.Cu",
    zones_in7_cu = ":Zones:In7.Cu",
    in8_cu = "In8.Cu",
    zones_in8_cu = ":Zones:In8.Cu",
    in9_cu = "In9.Cu",
    zones_in9_cu = ":Zones:In9.Cu",
    in10_cu = "In10.Cu",
    zones_in10_cu = ":Zones:In10.Cu",
    in11_cu = "In11.Cu",
    zones_in11_cu = ":Zones:In11.Cu",
    in12_cu = "In12.Cu",
    zones_in12_cu = ":Zones:In12.Cu",
    in13_cu = "In13.Cu",
    zones_in13_cu = ":Zones:In13.Cu",
    in14_cu = "In14.Cu",
    zones_in14_cu = ":Zones:In14.Cu",
    in15_cu = "In15.Cu",
    zones_in15_cu = ":Zones:In15.Cu",
    in16_cu = "In16.Cu",
    zones_in16_cu = ":Zones:In16.Cu",
    in17_cu = "In17.Cu",
    zones_in17_cu = ":Zones:In17.Cu",
    in18_cu = "In18.Cu",
    zones_in18_cu = ":Zones:In18.Cu",
    in19_cu = "In19.Cu",
    zones_in19_cu = ":Zones:In19.Cu",
    in20_cu = "In20.Cu",
    zones_in20_cu = ":Zones:In20.Cu",
    in21_cu = "In21.Cu",
    zones_in21_cu = ":Zones:In21.Cu",
    in22_cu = "In22.Cu",
    zones_in22_cu = ":Zones:In22.Cu",
    in23_cu = "In23.Cu",
    zones_in23_cu = ":Zones:In23.Cu",
    in24_cu = "In24.Cu",
    zones_in24_cu = ":Zones:In24.Cu",
    in25_cu = "In25.Cu",
    zones_in25_cu = ":Zones:In25.Cu",
    in26_cu = "In26.Cu",
    zones_in26_cu = ":Zones:In26.Cu",
    in27_cu = "In27.Cu",
    zones_in27_cu = ":Zones:In27.Cu",
    in28_cu = "In28.Cu",
    zones_in28_cu = ":Zones:In28.Cu",
    in29_cu = "In29.Cu",
    zones_in29_cu = ":Zones:In29.Cu",
    in30_cu = "In30.Cu",
    zones_in30_cu = ":Zones:In30.Cu",
    pads_back = ":Pads:Back",
    b_cu = "B.Cu",
    zones_b_cu = ":Zones:B.Cu",
    b_mask = "B.Mask",
    b_silks = "B.SilkS",
    b_adhes = "B.Adhes",
    b_paste = "B.Paste",
    b_crtyd = "B.CrtYd",
    b_fab = "B.Fab",
}

const hole_layers = [
    LayerName.via_holes,
    LayerName.pad_holes,
    LayerName.via_through,
    LayerName.via_buriedblind,
    LayerName.via_microvia,
];

const copper_layers = [
    LayerName.f_cu,
    LayerName.in1_cu,
    LayerName.in2_cu,
    LayerName.in3_cu,
    LayerName.in4_cu,
    LayerName.in5_cu,
    LayerName.in6_cu,
    LayerName.in7_cu,
    LayerName.in8_cu,
    LayerName.in9_cu,
    LayerName.in10_cu,
    LayerName.in11_cu,
    LayerName.in12_cu,
    LayerName.in13_cu,
    LayerName.in14_cu,
    LayerName.in15_cu,
    LayerName.in16_cu,
    LayerName.in17_cu,
    LayerName.in18_cu,
    LayerName.in19_cu,
    LayerName.in20_cu,
    LayerName.in21_cu,
    LayerName.in22_cu,
    LayerName.in23_cu,
    LayerName.in24_cu,
    LayerName.in25_cu,
    LayerName.in26_cu,
    LayerName.in27_cu,
    LayerName.in28_cu,
    LayerName.in29_cu,
    LayerName.in30_cu,
    LayerName.b_cu,
];

/**
 * Board view layer set
 */
export class LayerSet extends BaseLayerSet {
    /**
     * Create a new LayerSet
     */
    constructor(
        board: KicadPCB,
        public theme: Record<string, Color | Record<string, Color>>,
    ) {
        super();

        this.theme = theme;

        const board_layers = new Map();
        for (const l of board.layers) {
            board_layers.set(l.canonical_name, l);
        }

        for (const layer_name of Object.values(LayerName)) {
            // Skip physical layers that aren't present on the board.
            if (!layer_name.startsWith(":") && !board_layers.has(layer_name)) {
                continue;
            }

            // Skip virtual zone layers for physical layers that aren't present on the board.
            if (
                layer_name.startsWith(":Zones:") &&
                !board_layers.has(layer_name.slice(7))
            ) {
                continue;
            }

            let visible: VisibilityType = true;

            // These virtual layers require at least one visible copper layer to be shown.
            if (hole_layers.includes(layer_name)) {
                visible = () => this.is_any_copper_layer_visible();
            }

            // Pad layers require that the front or back layer is visible.
            if (layer_name == ":Pads:Front") {
                visible = () => this.by_name(LayerName.f_cu)!.visible;
            }
            if (layer_name == ":Pads:Back") {
                visible = () => this.by_name(LayerName.b_cu)!.visible;
            }

            // Zone virtual layers for copper layers require that the referenced
            // copper layer is visible.
            if (layer_name.startsWith(":Zones:")) {
                const copper_layer_name = layer_name.slice(7);
                visible = () => this.by_name(copper_layer_name)!.visible;
            }

            this.add(
                new ViewLayer(
                    this,
                    layer_name,
                    visible,
                    this.color_for(layer_name),
                ),
            );
        }
    }

    /**
     * Get the theme color for a given layer.
     */
    color_for(layer_name: string): Color {
        switch (layer_name) {
            case ":Via:Holes":
                return (this.theme["via_hole"] as Color) ?? Color.white;
            case ":Via:Through":
                return (this.theme["via_through"] as Color) ?? Color.white;
            case ":Pad:Holes":
                return (this.theme["background"] as Color) ?? Color.white;
            case ":Pad:HoleWalls":
                return (this.theme["pad_through_hole"] as Color) ?? Color.white;
        }

        let name = layer_name;

        name = name.replace(":Zones:", "").replace(".", "_").toLowerCase();

        if (name.endsWith("_cu")) {
            name = name.replace("_cu", "");
            return (
                (this.theme["copper"] as Record<string, Color>)?.[name] ??
                Color.white
            );
        }

        return (this.theme[name] as Color) ?? Color.white;
    }

    /**
     * @yields layers that coorespond to board layers that should be
     *      displayed in the layer selection UI
     */
    *in_ui_order() {
        const order = [
            ...copper_layers,
            LayerName.f_adhes,
            LayerName.b_adhes,
            LayerName.f_paste,
            LayerName.b_paste,
            LayerName.f_silks,
            LayerName.b_silks,
            LayerName.f_mask,
            LayerName.b_mask,
            LayerName.dwgs_user,
            LayerName.cmts_user,
            LayerName.eco1_user,
            LayerName.eco2_user,
            LayerName.edge_cuts,
            LayerName.margin,
            LayerName.f_crtyd,
            LayerName.b_crtyd,
            LayerName.f_fab,
            LayerName.b_fab,
            LayerName.user_1,
            LayerName.user_2,
            LayerName.user_3,
            LayerName.user_4,
            LayerName.user_5,
            LayerName.user_6,
            LayerName.user_7,
            LayerName.user_8,
            LayerName.user_9,
        ];

        for (const name of order) {
            const layer: ViewLayer = this.by_name(name as string)!;

            if (layer) {
                yield layer;
            }
        }
    }

    /**
     * @returns true if any copper layer is enabled and visible.
     */
    is_any_copper_layer_visible(): boolean {
        for (const name of copper_layers) {
            const layer = this.by_name(name);
            if (layer?.visible) {
                return true;
            }
        }
        return false;
    }
}
