/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color";
import {
    ViewLayer as ViewLayer,
    ViewLayerSet as BaseLayerSet,
} from "../framework/view-layers";
import { KicadPCB } from "../kicad/board";
export { ViewLayer as Layer };

const max_inner_copper_layers = 30;

/** Board view layer set
 *
 * There are view layers that correspond to respective board layers, but
 * there are also several graphical layers that are "virtual", such as layers
 * for drill holes and such.
 */
export class LayerSet extends BaseLayerSet {
    theme: Record<string, Color>;

    /**
     * Create a new LayerSet
     */
    constructor(board: KicadPCB, theme) {
        super();

        this.theme = theme;

        let layer_names = [
            ":Overlay",
            "Dwgs.User",
            "Cmts.User",
            "Eco1.User",
            "Eco2.User",
            "Edge.Cuts",
            "Margin",
        ];

        for (const layer_name of layer_names) {
            this.add(
                new ViewLayer(
                    this,
                    layer_name,
                    true,
                    this.color_for(layer_name)
                )
            );
        }

        layer_names = [
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

        for (const layer_name of layer_names) {
            if (board.layers[layer_name]) {
                this.add(
                    new ViewLayer(
                        this,
                        layer_name,
                        true,
                        this.color_for(layer_name)
                    )
                );
            }
        }

        this.add(
            new ViewLayer(this, ":Anchors", true, this.color_for(":Anchors"))
        );

        layer_names = [
            ":Via:Holes",
            ":Pad:Holes",
            ":Pad:HoleWalls",
            ":Via:Through",
            ":Via:BuriedBlind",
            ":Via:MicroVia",
        ];

        for (const layer_name of layer_names) {
            this.add(
                new ViewLayer(
                    this,
                    layer_name,
                    () => this.is_any_copper_layer_visible(),
                    this.color_for(layer_name)
                )
            );
        }

        this.add(
            new ViewLayer(
                this,
                ":Pads:Front",
                () => this.by_name("F.Cu").visible,
                this.color_for(":Pads:Front")
            ),
            new ViewLayer(this, "F.Cu", true, this.color_for("F.Cu")),
            new ViewLayer(
                this,
                ":Zones:F.Cu",
                () => this.by_name("F.Cu").visible,
                this.color_for(":Zones:F.Cu")
            )
        );

        layer_names = [
            "F.Mask",
            "F.SilkS",
            "F.Adhes",
            "F.Paste",
            "F.CrtYd",
            "F.Fab",
        ];

        for (const layer_name of layer_names) {
            this.add(
                new ViewLayer(
                    this,
                    layer_name,
                    true,
                    this.color_for(layer_name)
                )
            );
        }

        for (let i = 1; i <= max_inner_copper_layers; i++) {
            const layer_name = `In${i}.Cu`;

            if (!board.layers[layer_name]) {
                continue;
            }

            this.add(
                new ViewLayer(
                    this,
                    layer_name,
                    true,
                    this.color_for(layer_name)
                ),
                new ViewLayer(
                    this,
                    `:Zones:${layer_name}`,
                    () => this.by_name(layer_name).visible,
                    this.color_for(layer_name)
                )
            );
        }

        this.add(
            new ViewLayer(
                this,
                ":Pads:Back",
                () => this.by_name("B.Cu").visible,
                this.color_for(":Pads:Back")
            ),
            new ViewLayer(this, "B.Cu", true, this.color_for("B.Cu")),
            new ViewLayer(
                this,
                ":Zones:B.Cu",
                () => this.by_name("B.Cu").visible,
                this.color_for(":Zones:B.Cu")
            )
        );

        layer_names = [
            "B.Mask",
            "B.SilkS",
            "B.Adhes",
            "B.Paste",
            "B.CrtYd",
            "B.Fab",
        ];

        for (const layer_name of layer_names) {
            this.add(
                new ViewLayer(
                    this,
                    layer_name,
                    true,
                    this.color_for(layer_name)
                )
            );
        }
    }

    /**
     * Get the theme color for a given layer.
     */
    color_for(layer_name: string): Color {
        switch (layer_name) {
            case ":Via:Holes":
                return this.theme.via_hole;
            case ":Via:Through":
                return this.theme.via_through;
            case ":Pad:Holes":
                return this.theme.background;
            case ":Pad:HoleWalls":
                return this.theme.pad_through_hole;
        }

        let name = layer_name;

        name = name.replace(":Zones:", "").replace(".", "_").toLowerCase();

        if (name.endsWith("_cu")) {
            name = name.replace("_cu", "");
            return this.theme.copper[name];
        }

        return this.theme[name] ?? Color.white;
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
                    if (layer) {
                        yield layer;
                    }
                }
            } else {
                const layer: ViewLayer = this.by_name(name as string);

                if (layer) {
                    yield layer;
                }
            }
        }
    }

    /**
     * @returns true if any copper layer is enabled and visible.
     */
    is_any_copper_layer_visible(): boolean {
        for (const l of this.in_display_order()) {
            if (l.name.endsWith(".Cu") && l.visible) {
                return true;
            }
        }
        return false;
    }
}
