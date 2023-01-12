class Layer {
    constructor(number, name, depends_on) {
        this.number = number;
        this.name = name;
        this.depends_on = depends_on;
        this.visible = true;
        this.items = [];
    }
}

export default function layers() {
    const layers_ordered = [
        new Layer(1, "Virtual:select_overlay"),

        new Layer(2, "Virtual:Pad:NetNames", ["Virtual:Pads"]),
        new Layer(2, "Virtual:Via:NetNames", ["Virtual:Vias"]),

        new Layer(3, "Board:Dwgs.User"),
        new Layer(4, "Board:Cmts.User"),
        new Layer(1, "Board:Eco1.User"),
        new Layer(1, "Board:Eco2.User"),
        new Layer(1, "Board:Edge.Cuts"),
        new Layer(1, "Board:Margin"),

        new Layer(1, "Board:User.1"),
        new Layer(1, "Board:User.2"),
        new Layer(1, "Board:User.3"),
        new Layer(1, "Board:User.4"),
        new Layer(1, "Board:User.5"),
        new Layer(1, "Board:User.6"),
        new Layer(1, "Board:User.7"),
        new Layer(1, "Board:User.8"),
        new Layer(1, "Board:User.9"),

        new Layer(1, "Virtual:Footprint:Text"),
        new Layer(1, "Virtual:Footprint:References"),
        new Layer(1, "Virtual:Footprint:Values"),
        new Layer(1, "Virtual:Anchors"),

        new Layer(1, "Virtual:Via:Holes"),
        new Layer(1, "Virtual:Pad:Holes"),
        new Layer(1, "Virtual:Pad:HoleWalls"),
        new Layer(1, "Virtual:Via:Through"),
        new Layer(1, "Virtual:Via:BuriedBlind"),
        new Layer(1, "Virtual:Via:MicroVia"),

        new Layer(1, "Virtual:Pads:Front:NetNames", "Virtual:Pads:Front"),
        new Layer(1, "Virtual:Pads:Front", ["Board:F.Cu"]),
        new Layer(1, "Virtual:F.Cu:NetNames", ["Virtual:Pads:Front"]),
        new Layer(1, "Board:F.Cu"),
        new Layer(1, "Board:F.Mask"),
        new Layer(1, "Board:F.SilkS"),
        new Layer(1, "Board:F.Adhes"),
        new Layer(1, "Board:F.Paste"),
        new Layer(1, "Board:F.CrtYd"),
        new Layer(1, "Board:F.Fab"),

        new Layer(1, "Virtual:In1.Cu:NetNames"),
        new Layer(1, "Board:In1.Cu"),
        new Layer(1, "Virtual:In2.Cu:NetNames"),
        new Layer(1, "Board:In2.Cu"),
        new Layer(1, "Virtual:In3.Cu:NetNames"),
        new Layer(1, "Board:In3.Cu"),
        new Layer(1, "Virtual:In4.Cu:NetNames"),
        new Layer(1, "Board:In4.Cu"),
        new Layer(1, "Virtual:In5.Cu:NetNames"),
        new Layer(1, "Board:In5.Cu"),
        new Layer(1, "Virtual:In6.Cu:NetNames"),
        new Layer(1, "Board:In6.Cu"),
        new Layer(1, "Virtual:In7.Cu:NetNames"),
        new Layer(1, "Board:In7.Cu"),
        new Layer(1, "Virtual:In8.Cu:NetNames"),
        new Layer(1, "Board:In8.Cu"),
        new Layer(1, "Virtual:In9.Cu:NetNames"),
        new Layer(1, "Board:In9.Cu"),
        new Layer(1, "Virtual:In10.Cu:NetNames"),
        new Layer(1, "Board:In10.Cu"),
        new Layer(1, "Virtual:In11.Cu:NetNames"),
        new Layer(1, "Board:In11.Cu"),
        new Layer(1, "Virtual:In12.Cu:NetNames"),
        new Layer(1, "Board:In12.Cu"),
        new Layer(1, "Virtual:In13.Cu:NetNames"),
        new Layer(1, "Board:In13.Cu"),
        new Layer(1, "Virtual:In14.Cu:NetNames"),
        new Layer(1, "Board:In14.Cu"),
        new Layer(1, "Virtual:In15.Cu:NetNames"),
        new Layer(1, "Board:In15.Cu"),
        new Layer(1, "Virtual:In16.Cu:NetNames"),
        new Layer(1, "Board:In16.Cu"),
        new Layer(1, "Virtual:In17.Cu:NetNames"),
        new Layer(1, "Board:In17.Cu"),
        new Layer(1, "Virtual:In18.Cu:NetNames"),
        new Layer(1, "Board:In18.Cu"),
        new Layer(1, "Virtual:In19.Cu:NetNames"),
        new Layer(1, "Board:In19.Cu"),
        new Layer(1, "Virtual:In20.Cu:NetNames"),
        new Layer(1, "Board:In20.Cu"),
        new Layer(1, "Virtual:In21.Cu:NetNames"),
        new Layer(1, "Board:In21.Cu"),
        new Layer(1, "Virtual:In22.Cu:NetNames"),
        new Layer(1, "Board:In22.C2u"),
        new Layer(1, "Virtual:In23.Cu:NetNames"),
        new Layer(1, "Board:In23.Cu"),
        new Layer(1, "Virtual:In24.Cu:NetNames"),
        new Layer(1, "Board:In24.Cu"),
        new Layer(1, "Virtual:In25.Cu:NetNames"),
        new Layer(1, "Board:In25.Cu"),
        new Layer(1, "Virtual:In26.Cu:NetNames"),
        new Layer(1, "Board:In26.Cu"),
        new Layer(1, "Virtual:In27.Cu:NetNames"),
        new Layer(1, "Board:In27.Cu"),
        new Layer(1, "Virtual:In28.Cu:NetNames"),
        new Layer(1, "Board:In28.Cu"),
        new Layer(1, "Virtual:In29.Cu:NetNames"),
        new Layer(1, "Board:In29.Cu"),
        new Layer(1, "Virtual:In30.Cu:NetNames"),
        new Layer(1, "Board:In30.Cu"),

        new Layer(1, "Virtual:Pads:Back:NetNames", ["Virtual:Pads:Back"]),
        new Layer(1, "Virtual:Pads:Back", ["Board:B.Cu"]),
        new Layer(1, "Virtual:B.Cu:NetNames"),
        new Layer(1, "Board:B.Cu"),
        new Layer(1, "Board:B.Mask"),
        new Layer(1, "Board:B.SilkS"),
        new Layer(1, "Board:B.Adhes"),
        new Layer(1, "Board:B.Paste"),
        new Layer(1, "Board:B.CrtYd"),
        new Layer(1, "Board:B.Fab"),
    ];

    const mapped = new Map();
    for (const l of layers_ordered) {
        mapped.set(l.name, l);
    }

    return mapped;
}
