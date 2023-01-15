class Layer {
    constructor(name) {
        this.name = name;
        this.visible = true;
        this.items = [];
    }
}

export default function layers() {
    const layers_ordered = [
        new Layer(":Overlay"),

        new Layer("Dwgs.User"),
        new Layer("Cmts.User"),
        new Layer("Eco1.User"),
        new Layer("Eco2.User"),
        new Layer("Edge.Cuts"),
        new Layer("Margin"),

        new Layer("User.1"),
        new Layer("User.2"),
        new Layer("User.3"),
        new Layer("User.4"),
        new Layer("User.5"),
        new Layer("User.6"),
        new Layer("User.7"),
        new Layer("User.8"),
        new Layer("User.9"),

        new Layer(":Anchors"),

        new Layer(":Via:Holes"),
        new Layer(":Pad:Holes"),
        new Layer(":Pad:HoleWalls"),
        new Layer(":Via:Through"),
        new Layer(":Via:BuriedBlind"),
        new Layer(":Via:MicroVia"),

        new Layer(":Pads:Front"),
        new Layer("F.Cu"),
        new Layer("F.Mask"),
        new Layer("F.SilkS"),
        new Layer("F.Adhes"),
        new Layer("F.Paste"),
        new Layer("F.CrtYd"),
        new Layer("F.Fab"),

        new Layer("In1.Cu"),
        new Layer("In2.Cu"),
        new Layer("In3.Cu"),
        new Layer("In4.Cu"),
        new Layer("In5.Cu"),
        new Layer("In6.Cu"),
        new Layer("In7.Cu"),
        new Layer("In8.Cu"),
        new Layer("In9.Cu"),
        new Layer("In10.Cu"),
        new Layer("In11.Cu"),
        new Layer("In12.Cu"),
        new Layer("In13.Cu"),
        new Layer("In14.Cu"),
        new Layer("In15.Cu"),
        new Layer("In16.Cu"),
        new Layer("In17.Cu"),
        new Layer("In18.Cu"),
        new Layer("In19.Cu"),
        new Layer("In20.Cu"),
        new Layer("In21.Cu"),
        new Layer("In22.Cu"),
        new Layer("In23.Cu"),
        new Layer("In24.Cu"),
        new Layer("In25.Cu"),
        new Layer("In26.Cu"),
        new Layer("In27.Cu"),
        new Layer("In28.Cu"),
        new Layer("In29.Cu"),
        new Layer("In30.Cu"),

        new Layer(":Pads:Back"),
        new Layer("B.Cu"),
        new Layer("B.Mask"),
        new Layer("B.SilkS"),
        new Layer("B.Adhes"),
        new Layer("B.Paste"),
        new Layer("B.CrtYd"),
        new Layer("B.Fab"),
    ];

    const mapped = new Map();
    for (const l of layers_ordered) {
        mapped.set(l.name, l);
    }

    return mapped;
}
