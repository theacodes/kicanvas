class Layer {
    #visible;
    enabled;

    constructor(name, visible = true, enabled = true) {
        this.name = name;
        this.#visible = visible;
        this.enabled = enabled;
        this.items = [];
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
    #layer_list = [];
    #layer_map = new Map();

    constructor() {
        this.#layer_list = [
            new Layer(":Overlay"),

            new Layer("Dwgs.User"),
            new Layer("Cmts.User"),
            new Layer("Eco1.User"),
            new Layer("Eco2.User"),
            new Layer("Edge.Cuts"),
            new Layer("Margin"),

            new Layer("User.1", true, false),
            new Layer("User.2", true, false),
            new Layer("User.3", true, false),
            new Layer("User.4", true, false),
            new Layer("User.5", true, false),
            new Layer("User.6", true, false),
            new Layer("User.7", true, false),
            new Layer("User.8", true, false),
            new Layer("User.9", true, false),

            new Layer(":Anchors"),

            new Layer(":Via:Holes"),
            new Layer(":Pad:Holes"),
            new Layer(":Pad:HoleWalls"),
            new Layer(":Via:Through"),
            new Layer(":Via:BuriedBlind"),
            new Layer(":Via:MicroVia"),

            new Layer(":Pads:Front", () => this.by_name("F.Cu").visible),
            new Layer("F.Cu"),
            new Layer(":Zones:F.Cu", () => this.by_name("F.Cu").visible),
            new Layer("F.Mask"),
            new Layer("F.SilkS"),
            new Layer("F.Adhes"),
            new Layer("F.Paste"),
            new Layer("F.CrtYd"),
            new Layer("F.Fab"),
        ];

        for (let i = 0; i <= max_inner_copper_layers; i++) {
            const name = `In${i}.Cu`;
            this.#layer_list.push(new Layer(name, true, false));
            this.#layer_list.push(
                new Layer(`:Zones:${name}`, () => this.by_name(name).visible)
            );
        }

        this.#layer_list = this.#layer_list.concat([
            new Layer(":Pads:Back", () => this.by_name("B.Cu").visible),
            new Layer("B.Cu"),
            new Layer(":Zones:B.Cu", () => this.by_name("B.Cu").visible),
            new Layer("B.Mask"),
            new Layer("B.SilkS"),
            new Layer("B.Adhes"),
            new Layer("B.Paste"),
            new Layer("B.CrtYd"),
            new Layer("B.Fab"),
        ]);

        for (const l of this.#layer_list) {
            this.#layer_map.set(l.name, l);
        }
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
