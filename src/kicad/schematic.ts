/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse_expr, P, T, type Parseable } from "./parser.ts";
import { Vec2 } from "../math/vec2.ts";
import { At, Effects, Paper, TitleBlock } from "./common.ts";
import { Color } from "../gfx/color.ts";

export class KicadSch {
    version: number;
    generator?: string;
    uuid: string;
    paper?: Paper;
    title_block?: TitleBlock;
    lib_symbols?: LibSymbols;
    wires: Wire[] = [];
    buses: Bus[] = [];
    bus_entries: BusEntry[] = [];
    bus_aliases: BusAlias[] = [];
    junctions: Junction[] = [];
    net_labels: NetLabel[] = [];
    global_labels: GlobalLabel[] = [];
    hierarchical_labels: HierarchicalLabel[] = [];
    symbols: SchematicSymbol[] = [];
    no_connects: NoConnect[] = [];
    drawings: (Polyline | Text)[] = [];
    images: Image[] = [];
    sheet_instances?: SheetInstances;
    symbol_instances?: SymbolInstances;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("kicad_sch"),
                P.pair("version", T.number),
                P.pair("generator", T.string),
                P.pair("uuid", T.string),
                P.item("paper", Paper),
                P.item("title_block", TitleBlock),
                P.item("lib_symbols", LibSymbols),
                P.collection("wires", "wire", T.item(Wire)),
                P.collection("buses", "bus", T.item(Bus)),
                P.collection("bus_entries", "bus_entry", T.item(BusEntry)),
                P.collection("bus_aliases", "bus_alias", T.item(BusAlias)),
                P.collection("junctions", "junction", T.item(Junction)),
                P.collection("no_connects", "no_connect", T.item(NoConnect)),
                P.collection("net_labels", "label", T.item(NetLabel)),
                P.collection(
                    "global_labels",
                    "global_label",
                    T.item(GlobalLabel),
                ),
                P.collection(
                    "hierarchical_labels",
                    "hierarchical_label",
                    T.item(HierarchicalLabel),
                ),
                // images
                // sheets
                P.collection(
                    "symbols",
                    "symbol",
                    T.item(SchematicSymbol, this),
                ),
                P.collection("drawings", "polyline", T.item(Polyline, this)),
                P.collection("drawings", "text", T.item(Text, this)),
                P.collection("images", "image", T.item(Image)),
                P.item("sheet_instances", SheetInstances),
                P.item("symbol_instances", SymbolInstances),
            ),
        );
    }

    *items() {
        yield* this.wires;
        yield* this.buses;
        yield* this.bus_entries;
        yield* this.junctions;
        yield* this.net_labels;
        yield* this.global_labels;
        yield* this.hierarchical_labels;
        yield* this.no_connects;
        yield* this.symbols;
        yield* this.drawings;
        yield* this.images;
    }
}

export class Stroke {
    width: number;
    type: "dash" | "dot" | "dash_dot" | "dash_dot_dot" | "solid" | "default" =
        "default";
    color: Color;

    constructor(expr: Parseable) {
        /* (stroke (width 0.508) (type default) (color 0 0 0 0)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("stroke"),
                P.pair("width", T.number),
                P.pair("type", T.string),
                P.color(),
            ),
        );
    }
}

export class Fill {
    type: "none" | "outline" | "background" | "color";
    color: Color;

    constructor(expr: Parseable) {
        /* (fill (type none)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("fill"),
                P.pair("type", T.string),
                P.color(),
            ),
        );
    }
}

export class GraphicItem {
    parent?: LibSymbol | SchematicSymbol;
    private = false;
    stroke?: Stroke;
    fill?: Fill;

    constructor(parent?: LibSymbol | SchematicSymbol) {
        this.parent = parent;
    }

    static common_expr_defs = [
        P.atom("private"),
        P.item("stroke", Stroke),
        P.item("fill", Fill),
    ];
}

export class Wire {
    pts: Vec2[];
    uuid: string;
    stroke: Stroke;

    constructor(expr: Parseable) {
        /* (wire (pts (xy 43.18 195.58) (xy 31.75 195.58))
            (stroke (width 0) (type default) (color 0 0 0 0))
            (uuid 038156ee-7718-4322-b7b7-38f0697322c2)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("wire"),
                P.list("pts", T.vec2),
                P.item("stroke", Stroke),
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class Bus {
    pts: Vec2[];
    uuid: string;
    stroke: Stroke;

    constructor(expr: Parseable) {
        /* (bus (pts (xy 43.18 195.58) (xy 31.75 195.58))
            (stroke (width 0) (type default) (color 0 0 0 0))
            (uuid 038156ee-7718-4322-b7b7-38f0697322c2)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("bus"),
                P.list("pts", T.vec2),
                P.item("stroke", Stroke),
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class BusEntry {
    at: At;
    size: Vec2;
    uuid: string;
    stroke: Stroke;

    constructor(expr: Parseable) {
        /* (bus_entry (at 10 0) (size 2.54 2.54)
            (stroke (width 0) (type default) (color 0 0 0 0))
            (uuid 3b641c0a-296a-4bcf-b805-e697e8b794d1))*/
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("bus_entry"),
                P.item("at", At),
                P.vec2("size"),
                P.item("stroke", Stroke),
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class BusAlias {
    name: string;
    members: string[] = [];

    constructor(expr: Parseable) {
        /* (bus_alias "abusalias" (members "member1" "member2")) */
        Object.assign(
            this,
            parse_expr(expr, P.start("bus_alias"), P.list("members", T.string)),
        );
    }
}

export class Junction {
    at: At;
    diameter?: number;
    color?: Color;
    uuid: string;

    constructor(expr: Parseable) {
        /* (junction (at 179.07 95.885) (diameter 0) (color 0 0 0 0)
            (uuid 0650c6c5-fcca-459c-82ef-4388c8242b9d)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("junction"),
                P.item("at", At),
                P.pair("diameter", T.number),
                P.color(),
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class NoConnect {
    at: At;
    uuid: string;

    constructor(expr: Parseable) {
        /* (no_connect (at 236.22 92.71) (uuid f51df0a0-a355-457d-a756-de88302995ad)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("no_connect"),
                P.item("at", At),
                P.pair("uuid", T.string),
            ),
        );
    }
}

type Drawing = Arc | Bezier | Circle | Polyline | Rectangle | Text | TextBox;

export class Arc extends GraphicItem {
    start: Vec2;
    mid: Vec2;
    end: Vec2;

    constructor(expr: Parseable, parent?: LibSymbol | SchematicSymbol) {
        /*
        (arc (start 2.032 -1.27) (mid 0 -0.5572) (end -2.032 -1.27)
          (stroke (width 0.508) (type default) (color 0 0 0 0))
          (fill (type none)))
        */
        super(parent);
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("arc"),
                P.vec2("start"),
                P.vec2("mid"),
                P.vec2("end"),
                ...GraphicItem.common_expr_defs,
            ),
        );
    }
}

export class Bezier extends GraphicItem {
    pts: Vec2[];

    constructor(expr: Parseable, parent?: LibSymbol | SchematicSymbol) {
        /* TODO: this was added in KiCAD 7 */
        super(parent);
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("bezier"),
                P.list("pts", T.vec2),
                ...GraphicItem.common_expr_defs,
            ),
        );
    }

    get start() {
        return this.pts[0];
    }

    get c1() {
        return this.pts[1];
    }

    get c2() {
        return this.pts[2];
    }

    get end() {
        return this.pts[3];
    }
}

export class Circle extends GraphicItem {
    center: Vec2;
    radius: number;

    constructor(expr: Parseable, parent?: LibSymbol | SchematicSymbol) {
        /*
        (circle (center 0 0) (radius 0.508)
          (stroke (width 0) (type default) (color 0 0 0 0))
          (fill (type none)))
        */
        super(parent);
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("circle"),
                P.vec2("center"),
                P.pair("radius", T.number),
                ...GraphicItem.common_expr_defs,
            ),
        );
    }
}

export class Polyline extends GraphicItem {
    pts: Vec2[];
    uuid?: string;

    constructor(expr: Parseable, parent?: LibSymbol | SchematicSymbol) {
        /*
        (polyline
          (pts
            (xy -1.524 -0.508)
            (xy 1.524 -0.508))
          (stroke (width 0.3302) (type default) (color 0 0 0 0))
          (fill (type none)))
        */
        super(parent);
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("polyline"),
                P.list("pts", T.vec2),
                ...GraphicItem.common_expr_defs,
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class Rectangle extends GraphicItem {
    start: Vec2;
    end: Vec2;

    constructor(expr: Parseable, parent?: LibSymbol | SchematicSymbol) {
        /*
        (rectangle (start -10.16 7.62) (end 10.16 -7.62)
          (stroke (width 0.254) (type default) (color 0 0 0 0))
          (fill (type background)))
        */
        super(parent);
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("rectangle"),
                P.vec2("start"),
                P.vec2("end"),
                ...GraphicItem.common_expr_defs,
            ),
        );
    }
}

export class Image {
    uuid?: string;
    at: At;
    data: string;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("image"),
                P.item("at", At),
                P.pair("data", T.string),
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class Text {
    private = false;
    text: string;
    at: At;
    effects = new Effects();
    uuid?: string;

    constructor(
        expr: Parseable,
        public parent?: LibSymbol | SchematicSymbol | KicadSch,
    ) {
        /*
        (text "SWD" (at -5.08 0 900)
          (effects (font (size 2.54 2.54))))
        */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("text"),
                P.positional("text"),
                P.item("at", At),
                P.item("effects", Effects),
                P.pair("uuid", T.string),
            ),
        );

        if (parent instanceof LibSymbol || parent instanceof SchematicSymbol) {
            // From sch_sexpr_parser.cpp:LIB_TEXT* SCH_SEXPR_PARSER::parseText()
            // "Yes, LIB_TEXT is really decidegrees even though all the others are degrees. :("
            // motherfuck.
            this.at.rotation /= 10;
        }
    }
}

export class TextBox extends GraphicItem {
    text: string;
    at: At;
    size: Vec2;
    effects = new Effects();

    constructor(expr: Parseable, parent?: LibSymbol | SchematicSymbol) {
        /* TODO: This was added in KiCAD 7 */
        super(parent);
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("text"),
                P.positional("text"),
                P.item("at", At),
                P.vec2("size"),
                P.item("effects", Effects),
                ...GraphicItem.common_expr_defs,
            ),
        );
    }
}

export class Label {
    private = false;
    text: string;
    at: At;
    effects = new Effects();
    fields_autoplaced = false;
    uuid?: string;

    static common_expr_defs = [
        P.positional("text"),
        P.item("at", At),
        P.item("effects", Effects),
        P.atom("fields_autoplaced"),
        P.pair("uuid", T.string),
    ];
}

export class NetLabel extends Label {
    constructor(expr: Parseable) {
        /* (label "net label 2.54" (at 10 12 0)
            (effects (font (size 2.54 2.54)) (justify left bottom))
            (uuid 7c29627e-5d2a-4966-8e8b-eadd9d1e6530)) */
        super();
        Object.assign(
            this,
            parse_expr(expr, P.start("label"), ...Label.common_expr_defs),
        );
    }
}

type LabelShapes =
    | "input"
    | "output"
    | "bidirectional"
    | "tri_state"
    | "passive"
    | "dot"
    | "round"
    | "diamond"
    | "rectangle";

export class GlobalLabel extends Label {
    shape: LabelShapes = "input";
    properties: Property[] = [];

    constructor(expr: Parseable) {
        /* (global_label "global label tri state" (shape tri_state)
            (at 10 25 0) (fields_autoplaced)
            (effects (font (size 1.27 1.27)) (justify left))
            (uuid 1e3e64a3-cedc-4434-ab25-d00014c1e69d)
            (property "Intersheet References" "${INTERSHEET_REFS}" (id 0) (at 32.7936 24.9206 0)
            (effects (font (size 1.27 1.27)) (justify left) hide))) */
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("global_label"),
                ...Label.common_expr_defs,
                P.pair("shape", T.string),
                P.collection("properties", "property", T.item(Property)),
            ),
        );
    }
}

export class HierarchicalLabel extends Label {
    shape: LabelShapes = "input";

    constructor(expr: Parseable) {
        /* (hierarchical_label "h label passive" (shape passive) (at 18 30 270)
            (effects (font (size 1.27 1.27) (thickness 0.254) bold) (justify right))
            (uuid 484b38aa-713f-4f24-9fa1-63547d78e1da)) */
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("hierarchical_label"),
                ...Label.common_expr_defs,
                P.pair("shape", T.string),
            ),
        );
    }
}

export class LibSymbols {
    symbols: LibSymbol[] = [];
    #symbols_by_name: Map<string, LibSymbol> = new Map();

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("lib_symbols"),
                P.collection("symbols", "symbol", T.item(LibSymbol)),
            ),
        );

        for (const symbol of this.symbols) {
            this.#symbols_by_name.set(symbol.name, symbol);
        }
    }

    by_name(name: string) {
        return this.#symbols_by_name.get(name);
    }
}

export class LibSymbol {
    name: string;
    power = false;
    pin_numbers: {
        hide: boolean;
    } = { hide: false };
    pin_names: {
        offset: number;
        hide: boolean;
    } = { offset: 0, hide: false };
    in_bom = false;
    on_board = false;
    properties: Property[] = [];
    children: LibSymbol[] = [];
    drawings: Drawing[] = [];
    pins: PinDefinition[] = [];

    #pins_by_number: Map<string, PinDefinition> = new Map();
    #properties_by_id: Map<number, Property> = new Map();

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("symbol"),
                P.positional("name"),
                P.atom("power"),
                P.object("pin_numbers", this.pin_numbers, P.atom("hide")),
                P.object(
                    "pin_names",
                    this.pin_names,
                    P.pair("offset", T.number),
                    P.atom("hide"),
                ),
                P.pair("in_bom", T.boolean),
                P.pair("on_board", T.boolean),
                P.collection("properties", "property", T.item(Property, this)),
                P.collection("pins", "pin", T.item(PinDefinition, this)),
                P.collection("children", "symbol", T.item(LibSymbol, this)),
                P.collection("drawings", "arc", T.item(Arc, this)),
                P.collection("drawings", "bezier", T.item(Bezier, this)),
                P.collection("drawings", "circle", T.item(Circle, this)),
                P.collection("drawings", "polyline", T.item(Polyline, this)),
                P.collection("drawings", "rectangle", T.item(Rectangle, this)),
                P.collection("drawings", "text", T.item(Text, this)),
                P.collection("drawings", "textbox", T.item(TextBox, this)),
            ),
        );

        for (const pin of this.pins) {
            this.#pins_by_number.set(pin.number.text, pin);
        }

        for (const property of this.properties) {
            this.#properties_by_id.set(property.id, property);
        }
    }

    has_pin(number: string) {
        return this.#pins_by_number.has(number);
    }

    pin_by_number(number: string): PinDefinition {
        if (this.has_pin(number)) {
            return this.#pins_by_number.get(number);
        }
        for (const child of this.children) {
            if (child.has_pin(number)) {
                return child.pin_by_number(number);
            }
        }
        throw new Error(
            `No pin numbered ${number} on library symbol ${this.name}`,
        );
    }

    has_property(id: number) {
        return this.#properties_by_id.has(id);
    }

    property_by_id(id: number): Property {
        if (this.#properties_by_id.has(id)) {
            return this.#properties_by_id.get(id);
        }
        for (const child of this.children) {
            if (child.has_property(id)) {
                return child.property_by_id(id);
            }
        }
        throw new Error(
            `No property with id ${id} on library symbol ${this.name}`,
        );
    }
}

export class Property {
    name: string;
    text: string;
    id: number;
    at: At;
    show_name = false;
    do_not_autoplace = false;
    #effects?: Effects;

    constructor(expr: Parseable, public parent: LibSymbol | SchematicSymbol) {
        const parsed = parse_expr(
            expr,
            P.start("property"),
            P.positional("name", T.string),
            P.positional("text", T.string),
            P.pair("id", T.number),
            P.item("at", At),
            P.item("effects", Effects),
            P.atom("show_name"),
            P.atom("do_not_autoplace"),
        );

        this.#effects = parsed["effects"];
        delete parsed["effects"];

        Object.assign(this, parsed);
    }

    get effects(): Effects {
        if (this.#effects) {
            return this.#effects;
        } else if (this.parent instanceof SchematicSymbol) {
            return this.parent.lib_symbol
                .property_by_id(this.id)
                .effects.copy();
        }
        return new Effects();
    }

    set effects(e: Effects) {
        this.#effects = e;
    }
}

type PinElectricalType =
    | "input"
    | "output"
    | "bidirectional"
    | "tri_state"
    | "passive"
    | "unspecified"
    | "power_in"
    | "power_out"
    | "open_collector"
    | "open_emitter"
    | "unconnected"
    | "no_connect"
    | "free";

type PinShape =
    | "line"
    | "inverted"
    | "clock"
    | "inverted_clock"
    | "input_low"
    | "clock_low"
    | "output_low"
    | "edge_clock_high"
    | "non_logic";

export class PinDefinition {
    type: PinElectricalType;
    shape: PinShape;
    hide = false;
    at: At;
    length: number;
    name = {
        text: "",
        effects: new Effects(),
    };
    number = {
        text: "",
        effects: new Effects(),
    };
    alternates?: PinAlternate[];

    constructor(expr: Parseable, public parent: LibSymbol) {
        /*
        (pin power_in line (at -15.24 50.8 270) (length 2.54) hide
          (name "IOVDD" (effects (font (size 1.27 1.27))))
          (number "1" (effects (font (size 1.27 1.27))))
          (alternate "alt" input inverted_clock))
        */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("pin"),
                P.positional("type", T.string),
                P.positional("shape", T.string),
                P.atom("hide"),
                P.item("at", At),
                P.pair("length", T.number),
                P.object(
                    "name",
                    this.name,
                    P.positional("text", T.string),
                    P.item("effects", Effects),
                ),
                P.object(
                    "number",
                    this.number,
                    P.positional("text", T.string),
                    P.item("effects", Effects),
                ),
                P.collection("alternates", "alternate", T.item(PinAlternate)),
            ),
        );
    }
}

export class PinAlternate {
    name: string;
    type: PinElectricalType;
    shape: PinShape;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("alternate"),
                P.positional("name"),
                P.positional("type", T.string),
                P.positional("shaped", T.string),
            ),
        );
    }
}

export class SchematicSymbol {
    uuid: string;
    id: string;
    lib_name?: string;
    lib_id: string;
    at: At;
    mirror?: "x" | "y";
    unit?: number;
    convert? = false;
    in_bom = false;
    on_board = false;
    dnp = false;
    fields_autoplaced = false;
    properties: Property[] = [];
    pins: PinInstance[] = [];

    constructor(expr: Parseable, public parent: KicadSch) {
        /*
        (symbol (lib_id "Device:C_Small") (at 134.62 185.42 0) (unit 1)
          (in_bom yes) (on_board yes) (fields_autoplaced)
          (uuid 42d20c56-7e92-459e-8ba3-25545a76a4e9)
          (property "Reference" "C311" (id 0) (at 137.16 182.8862 0)
            (effects (font (size 1.27 1.27)) (justify left)))
          (property "Value" "100n" (id 1) (at 137.16 185.4262 0)
            (effects (font (size 1.27 1.27)) (justify left)))
          (property "Footprint" "winterbloom:C_0402_HandSolder" (id 2) (at 134.62 185.42 0)
            (effects (font (size 1.27 1.27)) hide))
          (pin "1" (uuid ab9b91d4-020f-476d-acd8-920c7892e89a))
          (pin "2" (uuid ec1eed11-c9f6-4ab0-ad9c-a96c0cb10d03)))
        */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("symbol"),
                P.pair("lib_name", T.string),
                P.pair("lib_id", T.string),
                P.item("at", At),
                P.pair("mirror", T.string),
                P.pair("unit", T.number),
                P.atom("convert"),
                P.pair("in_bom", T.boolean),
                P.pair("on_board", T.boolean),
                P.pair("dnp", T.boolean),
                P.atom("fields_autoplaced"),
                P.pair("uuid", T.string),
                P.collection("properties", "property", T.item(Property, this)),
                P.collection("pins", "pin", T.item(PinInstance, this)),
                // TODO: instances introduced in KiCAD 7
                // TODO: default instance introduced in KiCAD 7
            ),
        );
    }

    get lib_symbol(): LibSymbol {
        return this.parent.lib_symbols.by_name(this.lib_name ?? this.lib_id);
    }
}

export class PinInstance {
    number: string;
    uuid: string;
    alternate: string;

    constructor(expr: Parseable, public parent: SchematicSymbol) {
        /* (pin "1" (uuid ab9b91d4-020f-476d-acd8-920c7892e89a) (alternate abc)) */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("pin"),
                P.positional("number", T.string),
                P.pair("uuid", T.string),
                P.pair("alternate", T.string),
            ),
        );
    }

    get definition() {
        return this.parent.lib_symbol.pin_by_number(this.number);
    }
}

export class SheetInstances {
    sheet_instances: SheetInstance[] = [];

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("sheet_instances"),
                P.collection("sheet_instances", "path", T.item(SheetInstance)),
            ),
        );
    }
}

export class SheetInstance {
    page: string;
    path: string;

    constructor(expr: Parseable) {
        /* (path "/" (page "1")) */
        Object.assign(
            this,
            parse_expr(
                expr,
                // note: start is "path"
                P.start("path"),
                P.positional("path", T.string),
                P.pair("page", T.string),
            ),
        );
    }
}

export class SymbolInstances {
    symbol_instances: SymbolInstances[] = [];

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("symbol_instances"),
                P.collection(
                    "symbol_instances",
                    "path",
                    T.item(SymbolInstance),
                ),
            ),
        );
    }
}

export class SymbolInstance {
    path: string;
    reference: string;
    unit: number;
    value: string;
    footprint: string;

    constructor(expr: Parseable) {
        /* (path "/dfac8bd5-de3e-410c-a76e-956b6a012495"
            (reference "C?") (unit 1) (value "C_Polarized_US") (footprint "")) */
        Object.assign(
            this,
            parse_expr(
                expr,
                // note: start is "path"
                P.start("path"),
                P.positional("path", T.string),
                P.pair("reference", T.string),
                P.pair("unit", T.number),
                P.pair("value", T.string),
                P.pair("footprint", T.string),
            ),
        );
    }
}
