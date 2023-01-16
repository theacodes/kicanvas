class Layer {
    #layers;
    name;
    #visible;
    enabled;

    constructor(layers, name, visible = true, enabled = true) {
        this.#layers = layers;
        this.name = name;
        this.#visible = visible;
        this.enabled = enabled;
        this.items = [];
    }

    get color() {
        return this.#layers.color_for(this.name);
    }

    get visible() {
        if (this.#visible instanceof Function) {
            return this.#visible();
        } else {
            return this.#visible;
        }
    }

    set visible(v) {
        this.#visible = v;
    }
}

const max_inner_copper_layers = 30;

export class Layers {
    #colors;
    #layer_list = [];
    #layer_map = new Map();

    constructor(colors) {
        this.#colors = colors;
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

            new Layer(this, ":Via:Holes"),
            new Layer(this, ":Pad:Holes"),
            new Layer(this, ":Pad:HoleWalls"),
            new Layer(this, ":Via:Through"),
            new Layer(this, ":Via:BuriedBlind"),
            new Layer(this, ":Via:MicroVia"),

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

        for (let i = 0; i <= max_inner_copper_layers; i++) {
            const name = `In${i}.Cu`;
            this.#layer_list.push(new Layer(this, name, true, false));
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

    color_for(layer_name) {
        return this.#colors.get_layer_color(layer_name);
    }

    *in_display_order() {
        for (const layer of this.#layer_list) {
            yield layer;
        }
    }

    *in_ui_order() {
        const order = [
            "F.Cu",
            Symbol.inner_copper,
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
            if (name == Symbol.inner_copper) {
                for (let i = 1; i <= max_inner_copper_layers; i++) {
                    const layer = this.by_name(`In${i}.Cu`);
                    if (layer.enabled) {
                        yield layer;
                    }
                }
            } else {
                const layer = this.by_name(name);

                if (layer.enabled) {
                    yield layer;
                }
            }
        }
    }

    by_name(name) {
        return this.#layer_map.get(name);
    }
}
