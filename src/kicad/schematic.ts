/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../base/color";
import * as log from "../base/log";
import { Arc as MathArc, Vec2 } from "../base/math";
import type { Project } from "../kicanvas/project";
import {
    At,
    Effects,
    Paper,
    Stroke,
    TitleBlock,
    expand_text_vars,
    unescape_string,
} from "./common";
import { P, T, parse_expr, type Parseable } from "./parser";

/* Default values for various things found in schematics
 * From EESchema's default_values.h, converted from mils to mm. */
export const DefaultValues = {
    /* The size of the rectangle indicating an unconnected wire or label */
    dangling_symbol_size: 0.3048, // 12 mils

    /* The size of the rectangle indicating a connected, unselected wire end */
    unselected_end_size: 0.1016, // 4 mils

    pin_length: 2.54, // 100 mils
    pinsymbol_size: 0.635, // 25 mils
    pinnum_size: 1.27, // 50 mils
    pinname_size: 1.27, // 50 mils
    selection_thickness: 0.0762, // 3 mils
    line_width: 0.1524, // 6 mils
    wire_width: 0.1524, // 6 mils
    bus_width: 0.3048, // 12 mils
    noconnect_size: 1.2192, // 48 mils
    junction_diameter: 0.9144, // 36 mils
    target_pin_radius: 0.381, // 15 mils

    /* The default bus and wire entry size. */
    sch_entry_size: 2.54, // 100 mils

    text_size: 1.27, // 50 mils

    /* Ratio of the font height to the baseline of the text above the wire. */
    text_offset_ratio: 0.15, // unitless ratio

    /* Ratio of the font height to space around global labels */
    label_size_ratio: 0.375, // unitless ratio

    /* The offset of the pin name string from the end of the pin in mils. */
    pin_name_offset: 0.508, // 20 mils
};

export class KicadSch {
    project?: Project;
    version: number;
    generator?: string;
    uuid: string;
    paper?: Paper;
    title_block = new TitleBlock();
    lib_symbols?: LibSymbols;
    wires: Wire[] = [];
    buses: Bus[] = [];
    bus_entries: BusEntry[] = [];
    bus_aliases: BusAlias[] = [];
    junctions: Junction[] = [];
    net_labels: NetLabel[] = [];
    global_labels: GlobalLabel[] = [];
    hierarchical_labels: HierarchicalLabel[] = [];
    symbols = new Map<string, SchematicSymbol>();
    no_connects: NoConnect[] = [];
    drawings: (Polyline | Text)[] = [];
    images: Image[] = [];
    sheet_instances?: SheetInstances;
    symbol_instances?: SymbolInstances;
    sheets: SchematicSheet[] = [];

    constructor(
        public filename: string,
        expr: Parseable,
    ) {
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
                P.item("lib_symbols", LibSymbols, this),
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
                    T.item(GlobalLabel, this),
                ),
                P.collection(
                    "hierarchical_labels",
                    "hierarchical_label",
                    T.item(HierarchicalLabel, this),
                ),
                // images
                P.mapped_collection(
                    "symbols",
                    "symbol",
                    (p: SchematicSymbol) => p.uuid,
                    T.item(SchematicSymbol, this),
                ),
                P.collection("drawings", "polyline", T.item(Polyline, this)),
                P.collection("drawings", "rectangle", T.item(Rectangle, this)),
                P.collection("drawings", "arc", T.item(Arc, this)),
                P.collection("drawings", "text", T.item(Text, this)),
                P.collection("images", "image", T.item(Image)),
                P.item("sheet_instances", SheetInstances),
                P.item("symbol_instances", SymbolInstances),
                P.collection("sheets", "sheet", T.item(SchematicSheet, this)),
            ),
        );

        this.update_hierarchical_data();
    }

    update_hierarchical_data(path?: string) {
        // Assigns SchematicSymbol properties based on data in symbol_instances,
        // used for differing values in hierarchical sheet instances.
        // See SCH_SHEET_LIST::UpdateSymbolInstanceData
        path ??= ``;

        const root_symbol_instances = (
            this.project?.root_schematic_page?.document as KicadSch
        )?.symbol_instances;
        const global_symbol_instances = this.symbol_instances;

        for (const s of this.symbols.values()) {
            const symbol_path = `${path}/${s.uuid}`;
            const instance_data =
                root_symbol_instances?.get(symbol_path) ??
                global_symbol_instances?.get(symbol_path) ??
                s.instances.get(path);

            if (!instance_data) {
                continue;
            }

            s.reference = instance_data.reference ?? s.reference;
            s.value = instance_data.value ?? s.value;
            s.footprint = instance_data.footprint ?? s.footprint;
            s.unit = instance_data.unit ?? s.unit;
        }

        // See SCH_SHEET_LIST::UpdateSheetInstanceData
        const root_sheet_instances = (
            this.project?.root_schematic_page?.document as KicadSch
        )?.sheet_instances;
        const global_sheet_instances = this.sheet_instances;

        for (const s of this.sheets) {
            const sheet_path = `${path}/${s.uuid}`;
            const instance_data =
                root_sheet_instances?.get(sheet_path) ??
                global_sheet_instances?.get(sheet_path) ??
                s.instances.get(path);

            if (!instance_data) {
                continue;
            }

            s.page = instance_data.page;
            s.path = instance_data.path;

            if (!s.instances.size) {
                const inst = new SchematicSheetInstance();
                inst.page = instance_data.page;
                inst.path = instance_data.path;
                s.instances.set("", inst);
            }
        }
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
        yield* this.symbols.values();
        yield* this.drawings;
        yield* this.images;
        yield* this.sheets;
    }

    find_symbol(uuid_or_ref: string) {
        if (this.symbols.has(uuid_or_ref)) {
            return this.symbols.get(uuid_or_ref)!;
        }
        for (const sym of this.symbols.values()) {
            if (sym.uuid == uuid_or_ref || sym.reference == uuid_or_ref) {
                return sym;
            }
        }
        return null;
    }

    find_sheet(uuid: string) {
        for (const sheet of this.sheets) {
            if (sheet.uuid == uuid) {
                return sheet;
            }
        }
        return null;
    }

    resolve_text_var(name: string): string | undefined {
        if (name == "FILENAME") {
            return this.filename;
        }

        // Cross-reference
        if (name.includes(":")) {
            const [uuid, field_name] = name.split(":") as [string, string];
            const symbol = this.symbols.get(uuid);

            if (symbol) {
                return symbol.resolve_text_var(field_name);
            }
        }

        return this.title_block.resolve_text_var(name);
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
    uuid?: string;

    constructor(parent?: LibSymbol | SchematicSymbol) {
        this.parent = parent;
    }

    static common_expr_defs = [
        P.atom("private"),
        P.item("stroke", Stroke),
        P.item("fill", Fill),
        P.pair("uuid", T.string),
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
        Current form:
        (arc (start 2.032 -1.27) (mid 0 -0.5572) (end -2.032 -1.27)
          (stroke (width 0.508) (type default) (color 0 0 0 0))
          (fill (type none)))

        Previous form:
        (arc (start -0.254 1.016) (end -0.254 -1.016)
          (radius (at -0.254 0) (length 1.016) (angles 90.1 -90.1))
          (stroke (width 0)) (fill(type none)))
        */
        super(parent);

        const parsed = parse_expr(
            expr,
            P.start("arc"),
            P.vec2("start"),
            P.vec2("mid"),
            P.vec2("end"),
            P.object(
                "radius",
                {},
                P.start("radius"),
                P.vec2("at"),
                P.pair("length"),
                P.vec2("angles"),
            ),
            ...GraphicItem.common_expr_defs,
        );

        // Deal with old format
        if (parsed["radius"]?.["length"]) {
            const arc = MathArc.from_center_start_end(
                parsed["radius"]["at"],
                parsed["end"],
                parsed["start"],
                1,
            );

            if (arc.arc_angle.degrees > 180) {
                [arc.start_angle, arc.end_angle] = [
                    arc.end_angle,
                    arc.start_angle,
                ];
            }

            parsed["start"] = arc.start_point;
            parsed["mid"] = arc.mid_point;
            parsed["end"] = arc.end_point;
        }
        delete parsed["radius"];

        Object.assign(this, parsed);
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
        public parent: KicadSch | LibSymbol | SchematicSymbol,
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

        // Remove trailing \n on text
        if (this.text.endsWith("\n")) {
            this.text = this.text.slice(0, this.text.length - 1);
        }
    }

    get shown_text() {
        return expand_text_vars(this.text, this.parent);
    }
}

export class LibText extends Text {
    constructor(
        expr: Parseable,
        public override parent: LibSymbol | SchematicSymbol,
    ) {
        super(expr, parent);

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
    at: At = new At();
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

    get shown_text() {
        return unescape_string(this.text);
    }
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

    constructor(expr?: Parseable) {
        /* (hierarchical_label "h label passive" (shape passive) (at 18 30 270)
            (effects (font (size 1.27 1.27) (thickness 0.254) bold) (justify right))
            (uuid 484b38aa-713f-4f24-9fa1-63547d78e1da)) */
        super();

        if (expr) {
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
}

export class LibSymbols {
    symbols: LibSymbol[] = [];
    #symbols_by_name: Map<string, LibSymbol> = new Map();

    constructor(
        expr: Parseable,
        public parent: KicadSch,
    ) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("lib_symbols"),
                P.collection("symbols", "symbol", T.item(LibSymbol, parent)),
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
    } = {
        offset: DefaultValues.pin_name_offset,
        hide: false,
    };
    in_bom = false;
    on_board = false;
    exclude_from_sim = false;
    properties: Map<string, Property> = new Map();
    children: LibSymbol[] = [];
    drawings: Drawing[] = [];
    pins: PinDefinition[] = [];
    units: Map<number, LibSymbol[]> = new Map();

    #pins_by_number: Map<string, PinDefinition> = new Map();
    #properties_by_id: Map<number, Property> = new Map();

    constructor(
        expr: Parseable,
        public parent?: LibSymbol | KicadSch,
    ) {
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
                P.pair("exclude_from_sim", T.boolean),
                P.mapped_collection(
                    "properties",
                    "property",
                    (p: Property) => p.name,
                    T.item(Property, this),
                ),
                P.collection("pins", "pin", T.item(PinDefinition, this)),
                P.collection("children", "symbol", T.item(LibSymbol, this)),
                P.collection("drawings", "arc", T.item(Arc, this)),
                P.collection("drawings", "bezier", T.item(Bezier, this)),
                P.collection("drawings", "circle", T.item(Circle, this)),
                P.collection("drawings", "polyline", T.item(Polyline, this)),
                P.collection("drawings", "rectangle", T.item(Rectangle, this)),
                P.collection("drawings", "text", T.item(LibText, this)),
                P.collection("drawings", "textbox", T.item(TextBox, this)),
            ),
        );

        for (const pin of this.pins) {
            this.#pins_by_number.set(pin.number.text, pin);
        }

        for (const property of this.properties.values()) {
            this.#properties_by_id.set(property.id, property);
        }

        for (const child of this.children) {
            const unit_num = child.unit;
            if (unit_num !== null) {
                const list = this.units.get(unit_num) ?? [];
                list.push(child);
                this.units.set(unit_num, list);
            }
        }
    }

    get root(): LibSymbol {
        if (this.parent instanceof LibSymbol) {
            return this.parent.root;
        }
        return this;
    }

    has_pin(number: string) {
        return this.#pins_by_number.has(number);
    }

    pin_by_number(number: string, style = 1): PinDefinition {
        if (this.has_pin(number)) {
            return this.#pins_by_number.get(number)!;
        }
        for (const child of this.children) {
            if (
                (child.style == 0 || child.style == style) &&
                child.has_pin(number)
            ) {
                return child.pin_by_number(number);
            }
        }
        throw new Error(
            `No pin numbered ${number} on library symbol ${this.name}`,
        );
    }

    has_property_with_id(id: number) {
        return this.#properties_by_id.has(id);
    }

    property_by_id(id: number): Property | null {
        if (this.#properties_by_id.has(id)) {
            return this.#properties_by_id.get(id)!;
        }
        for (const child of this.children) {
            if (child.has_property_with_id(id)) {
                return child.property_by_id(id);
            }
        }
        return null;
    }

    get library_name() {
        if (this.name.includes(":")) {
            return this.name.split(":").at(0)!;
        }

        return "";
    }

    get library_item_name() {
        if (this.name.includes(":")) {
            return this.name.split(":").at(1)!;
        }

        return "";
    }

    get unit_count(): number {
        // Unit 0 is common to all units, so it doesn't count towards
        // the total number of units.
        let count = this.units.size;

        if (this.units.has(0)) {
            count -= 1;
        }

        return count;
    }

    get unit(): number {
        // KiCAD encodes the symbol unit into the name, for example,
        // MCP6001_1_1 is unit 1 and MCP6001_2_1 is unit 2.
        // Unit 0 is common to all units.
        // See SCH_SEXPR_PARSER::ParseSymbol.
        const parts = this.name.split("_");
        if (parts.length < 3) {
            return 0;
        }

        return parseInt(parts.at(-2)!, 10);
    }

    get style(): number {
        // KiCAD "De Morgan" body styles are indicated with a number greater
        // than one at the end of the symbol name.
        // MCP6001_1_1 is the normal body and and MCP6001_1_2 is the alt style.
        // Style 0 is common to all styles.
        // See SCH_SEXPR_PARSER::ParseSymbol.
        const parts = this.name.split("_");
        if (parts.length < 3) {
            return 0;
        }

        return parseInt(parts.at(-1)!, 10);
    }

    get description(): string {
        return this.properties.get("ki_description")?.text ?? "";
    }

    get keywords(): string {
        return this.properties.get("ki_keywords")?.text ?? "";
    }

    get footprint_filters(): string {
        return this.properties.get("ki_fp_filters")?.text ?? "";
    }

    get units_interchangable(): boolean {
        return this.properties.get("ki_locked")?.text ? false : true;
    }

    resolve_text_var(name: string): string | undefined {
        return this.parent?.resolve_text_var(name);
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

    constructor(
        expr: Parseable,
        public parent: LibSymbol | SchematicSymbol | SchematicSheet,
    ) {
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
            this.#effects = new Effects();
        } else {
            log.warn(`Couldn't determine Effects for Property ${this.name}`);
        }
        return this.#effects!;
    }

    set effects(e: Effects) {
        this.#effects = e;
    }

    get shown_text() {
        return expand_text_vars(this.text, this.parent);
    }
}

export type PinElectricalType =
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

export type PinShape =
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

    constructor(
        expr: Parseable,
        public parent: LibSymbol,
    ) {
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

    get unit() {
        return this.parent.unit;
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
    convert: number;
    in_bom = false;
    on_board = false;
    exclude_from_sim = false;
    dnp = false;
    fields_autoplaced = false;
    properties: Map<string, Property> = new Map();
    pins: PinInstance[] = [];
    default_instance: {
        reference: string;
        unit: string;
        value: string;
        footprint: string;
    };
    instances: Map<string, SchematicSymbolInstance> = new Map();

    constructor(
        expr: Parseable,
        public parent: KicadSch,
    ) {
        /*
        (symbol (lib_id "Device:C_Small") (at 134.62 185.42 0) (unit 1)
          (in_bom yes) (on_board yes) (exclude_from_sim no) (fields_autoplaced)
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
        const parsed = parse_expr(
            expr,
            P.start("symbol"),
            P.pair("lib_name", T.string),
            P.pair("lib_id", T.string),
            P.item("at", At),
            P.pair("mirror", T.string),
            P.pair("unit", T.number),
            P.pair("convert", T.number),
            P.pair("in_bom", T.boolean),
            P.pair("on_board", T.boolean),
            P.pair("exclude_from_sim", T.boolean),
            P.pair("dnp", T.boolean),
            P.atom("fields_autoplaced"),
            P.pair("uuid", T.string),
            P.mapped_collection(
                "properties",
                "property",
                (p: Property) => p.name,
                T.item(Property, this),
            ),
            P.collection("pins", "pin", T.item(PinInstance, this)),
            P.object(
                "default_instance",
                this.default_instance,
                P.pair("reference", T.string),
                P.pair("unit", T.string),
                P.pair("value", T.string),
                P.pair("footprint", T.string),
            ),
            // (instances
            //    (project "kit-dev-coldfire-xilinx_5213"
            //      (path "/f5d7a48d-4587-4550-a504-c505ca11d375" (reference "R111") (unit 1))))
            P.object(
                "instances",
                {},
                P.collection(
                    "projects",
                    "project",
                    T.object(
                        null,
                        P.start("project"),
                        P.positional("name", T.string),
                        P.collection(
                            "paths",
                            "path",
                            T.object(
                                null,
                                P.start("path"),
                                P.positional("path"),
                                P.pair("reference", T.string),
                                P.pair("value", T.string),
                                P.pair("unit", T.number),
                                P.pair("footprint", T.string),
                            ),
                        ),
                    ),
                ),
            ),
        );

        const parsed_instances = parsed["instances"];
        delete parsed["instances"];

        Object.assign(this, parsed);

        // Walk through all instances and flatten them.
        for (const project of parsed_instances?.["projects"] ?? []) {
            for (const path of project?.["paths"] ?? []) {
                const inst = new SchematicSymbolInstance();
                inst.path = path["path"];
                inst.reference = path["reference"];
                inst.value = path["value"];
                inst.unit = path["unit"];
                inst.footprint = path["footprint"];
                this.instances.set(inst.path, inst);
            }
        }

        // Default instance is used only to set the value and footprint, the
        // other items seem to be ignored.
        if (this.get_property_text("Value") == undefined) {
            this.set_property_text("Value", this.default_instance.value);
        }

        if (!this.get_property_text("Footprint") == undefined) {
            this.set_property_text(
                "Footprint",
                this.default_instance.footprint,
            );
        }
    }

    get lib_symbol(): LibSymbol {
        // note: skipping a lot of null checks here because unless something
        // horrible has happened, the schematic should absolutely have the
        // library symbol for this symbol instance.
        return this.parent.lib_symbols!.by_name(this.lib_name ?? this.lib_id)!;
    }

    get_property_text(name: string) {
        return this.properties.get(name)?.text;
    }

    set_property_text(name: string, val: string) {
        const prop = this.properties.get(name);
        if (prop) {
            prop.text = val;
        }
    }

    get reference() {
        return this.get_property_text("Reference") ?? "?";
    }

    set reference(val: string) {
        this.set_property_text("Reference", val);
    }

    get value() {
        return this.get_property_text("Value") ?? "";
    }

    set value(val: string) {
        this.set_property_text("Value", val);
    }

    get footprint() {
        return this.get_property_text("Footprint") ?? "";
    }

    set footprint(val: string) {
        this.set_property_text("Footprint", val);
    }

    get unit_suffix() {
        if (!this.unit || this.lib_symbol.unit_count <= 1) {
            return "";
        }

        const A = "A".charCodeAt(0);
        let unit = this.unit;
        let suffix = "";

        do {
            const x = (unit - 1) % 26;
            suffix = String.fromCharCode(A + x) + suffix;
            unit = Math.trunc((unit - x) / 26);
        } while (unit > 0);

        return suffix;
    }

    get unit_pins() {
        return this.pins.filter((pin) => {
            if (this.unit && pin.unit && this.unit != pin.unit) {
                return false;
            }
            return true;
        });
    }

    resolve_text_var(name: string): string | undefined {
        if (this.properties.has(name)) {
            return this.properties.get(name)?.shown_text;
        }

        switch (name) {
            case "REFERENCE":
                return this.reference;
            case "VALUE":
                return this.value;
            case "FOOTPRINT":
                return this.footprint;
            case "DATASHEET":
                return this.properties.get("Datasheet")?.name;
            case "FOOTPRINT_LIBRARY":
                return this.footprint.split(":").at(0);
            case "FOOTPRINT_NAME":
                return this.footprint.split(":").at(-1);
            case "UNIT":
                return this.unit_suffix;
            case "SYMBOL_LIBRARY":
                return this.lib_symbol.library_name;
            case "SYMBOL_NAME":
                return this.lib_symbol.library_item_name;
            case "SYMBOL_DESCRIPTION":
                return this.lib_symbol.description;
            case "SYMBOL_KEYWORDS":
                return this.lib_symbol.keywords;
            case "EXCLUDE_FROM_BOM":
                return this.in_bom ? "" : "Excluded from BOM";
            case "EXCLUDE_FROM_BOARD":
                return this.on_board ? "" : "Excluded from board";
            case "DNP":
                return this.dnp ? "DNP" : "";
        }

        return this.parent.resolve_text_var(name);
    }
}

export class SchematicSymbolInstance {
    path: string;
    project?: string;
    reference?: string;
    value?: string;
    unit?: number;
    footprint?: string;

    constructor() {}
}

export class PinInstance {
    number: string;
    uuid: string;
    alternate: string;

    constructor(
        expr: Parseable,
        public parent: SchematicSymbol,
    ) {
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
        return this.parent.lib_symbol.pin_by_number(
            this.number,
            this.parent.convert,
        );
    }

    get unit() {
        return this.definition.unit;
    }
}

export class SheetInstances {
    sheet_instances: Map<string, SheetInstance> = new Map();

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("sheet_instances"),
                P.mapped_collection(
                    "sheet_instances",
                    "path",
                    (obj: SheetInstance) => obj.path,
                    T.item(SheetInstance),
                ),
            ),
        );
    }

    get(key: string) {
        return this.sheet_instances.get(key);
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
    symbol_instances: Map<string, SymbolInstance> = new Map();

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("symbol_instances"),
                P.mapped_collection(
                    "symbol_instances",
                    "path",
                    (obj: SymbolInstance) => obj.path,
                    T.item(SymbolInstance),
                ),
            ),
        );
    }

    get(key: string) {
        return this.symbol_instances.get(key);
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

export class SchematicSheet {
    at: At;
    size: Vec2;
    fields_autoplaced: boolean;
    stroke: Stroke;
    fill: Fill;
    properties: Map<string, Property> = new Map();
    pins: SchematicSheetPin[] = [];
    uuid: string;
    instances: Map<string, SchematicSheetInstance> = new Map();
    page?: string;
    path?: string;

    constructor(
        expr: Parseable,
        public parent: KicadSch,
    ) {
        const parsed = parse_expr(
            expr,
            P.start("sheet"),
            P.item("at", At),
            P.vec2("size"),
            P.item("stroke", Stroke),
            P.item("fill", Fill),
            P.pair("fields_autoplaced", T.boolean),
            P.pair("uuid", T.string),
            P.mapped_collection(
                "properties",
                "property",
                (prop: Property) => prop.name,
                T.item(Property, this),
            ),
            P.collection("pins", "pin", T.item(SchematicSheetPin, this)),
            // (instances
            //   (project "kit-dev-coldfire-xilinx_5213"
            //     (path "/f5d7a48d-4587-4550-a504-c505ca11d375" (page "3"))))
            P.object(
                "instances",
                {},
                P.collection(
                    "projects",
                    "project",
                    T.object(
                        null,
                        P.start("project"),
                        P.positional("name", T.string),
                        P.collection(
                            "paths",
                            "path",
                            T.object(
                                null,
                                P.start("path"),
                                P.positional("path"),
                                P.pair("page", T.string),
                            ),
                        ),
                    ),
                ),
            ),
        );

        const parsed_instances = parsed["instances"];
        delete parsed["instances"];

        Object.assign(this, parsed);

        // Walk through all instances and flatten them.
        for (const project of parsed_instances?.["projects"] ?? []) {
            for (const path of project?.["paths"] ?? []) {
                const inst = new SchematicSheetInstance();
                inst.path = path["path"];
                inst.page = path["page"];
                this.instances.set(inst.path, inst);
            }
        }
    }

    get_property_text(name: string) {
        return this.properties.get(name)?.text;
    }

    get sheetname() {
        return (
            this.get_property_text("Sheetname") ??
            this.get_property_text("Sheet name")
        );
    }

    get sheetfile() {
        return (
            this.get_property_text("Sheetfile") ??
            this.get_property_text("Sheet file")
        );
    }

    resolve_text_var(name: string): string | undefined {
        return this.parent?.resolve_text_var(name);
    }
}

export class SchematicSheetPin {
    at: At;
    name: string;
    shape: LabelShapes;
    effects: Effects;
    uuid: string;

    constructor(
        expr: Parseable,
        public parent: SchematicSheet,
    ) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("pin"),
                P.positional("name", T.string),
                P.positional("shape", T.string),
                P.item("at", At),
                P.item("effects", Effects),
                P.pair("uuid", T.string),
            ),
        );
    }
}

export class SchematicSheetInstance {
    path: string;
    page?: string;
}
