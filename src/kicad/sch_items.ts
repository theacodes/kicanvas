/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/*
    References:
    - https://dev-docs.kicad.org/en/file-formats/sexpr-intro/
    - https://gitlab.com/edea-dev/edea/-/tree/main/edea
*/

import { Vec2 } from "../math/vec2";
import { SExprParser } from "./parser";
import { At, Effects, Paper, TitleBlock } from "./common_data";
import { Color } from "../gfx/color";

export class Property {
    number: number;
    key: string;
    value: string;
    id: number;
    at: At;
    effects: Effects;

    constructor(
        public parent: SymbolInstance | LibrarySymbol,
        number: number,
        e: SExprParser
    ) {
        this.number = number;
        this.key = e.expect_string();
        this.value = e.expect_string();
        this.id = e.expect_pair_number("id");
        this.at = new At(e.expect_expr("at"));
        this.effects = new Effects(e.maybe_expr("effects"));
    }
}

export class Stroke {
    width: number;
    type: string;
    color: Color;

    constructor(e: SExprParser) {
        this.width = e.expect_pair_number("width");
        this.type = e.expect_pair_atom("type");
        this.color = e.expect_color();
    }
}

export class Rectangle {
    static sort_order = 48;
    start: Vec2;
    end: Vec2;
    stroke: Stroke;
    fill: string;

    constructor(e: SExprParser) {
        this.start = e.expect_vec2("start");
        this.end = e.expect_vec2("end");
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.expect_expr("fill").expect_pair_atom("type");
    }
}

export class Polyline {
    static sort_order = 47;

    pts: Vec2[];
    stroke: Stroke;
    fill: string;

    constructor(e: SExprParser) {
        this.pts = e.expect_vec2_list("pts");
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.maybe_expr("fill")?.expect_pair_atom("type");
    }
}

export class Circle {
    static sort_order = 48;
    center: Vec2;
    radius: number;
    stroke: Stroke;
    fill: string;

    constructor(e: SExprParser) {
        this.center = e.expect_vec2("center");
        this.radius = e.expect_pair_number("radius");
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.expect_expr("fill").expect_pair_atom("type");
    }
}

export class Arc {
    static sort_order = 48;
    start: Vec2;
    mid: Vec2;
    end: Vec2;
    stroke: Stroke;
    fill: string;

    constructor(e: SExprParser) {
        this.start = e.expect_vec2("start");
        this.mid = e.expect_vec2("mid");
        this.end = e.expect_vec2("end");
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.expect_expr("fill").expect_pair_atom("type");
    }
}

export class PinDefinition {
    type: string;
    style: string;
    at: At;
    length: number;
    hide: boolean;
    name: string;
    name_effects: Effects;
    number: string;
    number_effects: Effects;

    constructor(e: SExprParser) {
        this.type = e.expect_atom();
        this.style = e.expect_atom();
        this.at = new At(e.expect_expr("at"));
        this.length = e.expect_pair_number("length");
        this.hide = e.maybe_atom("hide") ? true : false;
        const name = e.expect_expr("name");
        this.name = name.expect_string();
        this.name_effects = new Effects(name.expect_expr("effects"));
        const number = e.expect_expr("number");
        this.number = number.expect_string();
        this.number_effects = new Effects(number.expect_expr("effects"));
    }
}

export class LibrarySymbol {
    id: string;
    power: boolean;
    hide_pin_numbers: boolean;
    pin_name_offset: number;
    hide_pin_names: boolean;
    in_bom: boolean;
    on_board: boolean;
    properties: Record<string, Property> = {};
    children: LibrarySymbol[] = [];
    graphics: any[] = [];
    pins: Record<string, PinDefinition> = {};

    constructor(e: SExprParser) {
        this.id = e.expect_string();
        this.power = e.maybe_expr("power") !== null;
        this.hide_pin_numbers = e.maybe_pair_atom("pin_numbers") === "hide";
        const pin_names = e.maybe_expr("pin_names");
        this.pin_name_offset = pin_names?.maybe_pair_number("offset") || 0.508;
        this.hide_pin_names = pin_names
            ? pin_names.maybe_atom("hide") !== null
            : false;
        this.in_bom = e.maybe_pair_atom("in_bom") === "yes";
        this.on_board = e.maybe_pair_atom("on_board") === "yes";

        while (e.element) {
            let se;
            if ((se = e.maybe_expr("property")) !== null) {
                const p = new Property(
                    this,
                    Object.values(this.properties).length,
                    se
                );
                this.properties[p.key] = p;
                continue;
            }
            if ((se = e.maybe_expr("symbol")) !== null) {
                const s = new LibrarySymbol(se);
                this.children.push(s);
                continue;
            }
            if ((se = e.maybe_expr("rectangle")) !== null) {
                this.graphics.push(new Rectangle(se));
                continue;
            }
            if ((se = e.maybe_expr("polyline")) !== null) {
                this.graphics.push(new Polyline(se));
                continue;
            }
            if ((se = e.maybe_expr("circle")) !== null) {
                this.graphics.push(new Circle(se));
                continue;
            }
            if ((se = e.maybe_expr("arc")) !== null) {
                this.graphics.push(new Arc(se));
                continue;
            }
            if ((se = e.maybe_expr("text")) !== null) {
                const t = new Text(this, se);
                this.graphics.push(t);
                continue;
            }
            if ((se = e.maybe_expr("pin")) !== null) {
                const p = new PinDefinition(se);
                this.pins[p.number] = p;
                continue;
            }
            console.log("unknown", e.element);
            break;
        }

        this.graphics
            .sort((a, b) => {
                // see EDA_SHAPE::Compare
                const type_sort =
                    a.constructor.sort_order - b.constructor.sort_order;
                if (type_sort !== 0) {
                    return type_sort;
                }
                const a_bg = a.fill === "background" ? 1 : 0;
                const b_bg = b.fill === "background" ? 1 : 0;
                return a_bg - b_bg;
            })
            .reverse();
    }
}

export class PinInstance {
    name: string;
    uuid: string;

    constructor(public parent: SymbolInstance, e: SExprParser) {
        this.name = e.expect_string();
        this.uuid = e.expect_pair_atom("uuid");
    }

    get definition(): PinDefinition {
        return this.parent.lib_symbol.pins[this.name];
    }
}

export class SymbolInstance {
    static sort_order = 57;
    lib_name: string;
    lib_id: string;
    lib_symbol: LibrarySymbol;
    at: At;
    mirror: string;
    unit: any;
    in_bom: boolean;
    on_board: boolean;
    fields_autoplaced: boolean;
    uuid: string;
    properties: Record<string, Property> = {};
    pins: Record<string, PinInstance> = {};

    constructor(e: SExprParser, lib_symbols: Map<string, LibrarySymbol>) {
        this.lib_name = e.maybe_pair_string("lib_name");
        this.lib_id = e.expect_pair_string("lib_id");
        this.lib_symbol =
            lib_symbols.get(this.lib_id) || lib_symbols.get(this.lib_name);

        this.at = new At(e.expect_expr("at"));
        this.mirror = e.maybe_pair_atom("mirror");
        this.unit = e.maybe_pair_any("unit");
        this.in_bom = e.maybe_pair_atom("in_bom") === "yes";
        this.on_board = e.maybe_pair_atom("on_board") === "yes";
        this.fields_autoplaced = e.maybe_expr("fields_autoplaced") !== null;
        this.uuid = e.expect_pair_atom("uuid");

        while (e.element) {
            let se;
            if ((se = e.maybe_expr("property")) !== null) {
                const p = new Property(
                    this,
                    Object.values(this.properties).length,
                    se
                );
                this.properties[p.key] = p;
                continue;
            }
            if ((se = e.maybe_expr("pin")) !== null) {
                const p = new PinInstance(this, se);
                this.pins[p.name] = p;
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
    }
}

export class Wire {
    static sort_order = 45;
    pts: Vec2[];
    stroke: Stroke;
    uuid: string;

    constructor(e: SExprParser) {
        this.pts = e.expect_vec2_list("pts");
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.uuid = e.expect_pair_atom("uuid");
    }
}

export class Junction {
    static sort_order = 43;
    at: At;
    diameter: number;
    color: Color;
    uuid: string;

    constructor(e: SExprParser) {
        this.at = new At(e.expect_expr("at"));
        this.diameter = e.expect_pair_number("diameter");
        this.color = e.expect_color("color");
        this.uuid = e.expect_pair_atom("uuid");
    }
}

export class Label {
    static sort_order = 53;
    name: string;
    at: At;
    effects: Effects;
    uuid: string;

    constructor(e: SExprParser) {
        this.name = e.expect_string();
        this.at = new At(e.expect_expr("at"));
        this.effects = new Effects(e.expect_expr("effects"));
        this.uuid = e.expect_pair_atom("uuid");
    }
}

export class HierarchicalLabel {
    static sort_order = 54;
    name: string;
    shape: string;
    at: At;
    effects: Effects;
    uuid: string;

    constructor(e: SExprParser) {
        this.name = e.expect_string();
        this.shape = e.expect_pair_atom("shape");
        this.at = new At(e.expect_expr("at"));
        this.effects = new Effects(e.expect_expr("effects"));
        this.uuid = e.expect_pair_atom("uuid");
    }
}

export class Text {
    static sort_order = 51;
    parent: LibrarySymbol = null;
    text: string;
    at: At;
    effects: Effects;
    uuid: string;

    constructor(parent: LibrarySymbol, e: SExprParser) {
        this.parent = parent;
        this.text = e.expect_string();
        this.at = new At(e.expect_expr("at"));
        this.effects = new Effects(e.expect_expr("effects"));
        this.uuid = e.maybe_pair_atom("uuid");

        // From sch_sexpr_parser.cpp:1598:
        // "Yes, LIB_TEXT is really decidegrees even though all the others are degrees. :("
        // motherfuck.
        if (parent) {
            this.at.rotation = this.at.rotation / 10;
        }
    }
}

export class NoConnect {
    static sort_order = 44;
    at: At;
    uuid: string;

    constructor(e: SExprParser) {
        this.at = new At(e.expect_expr("at"));
        this.uuid = e.expect_pair_atom("uuid");
    }
}

type Graphics = Polyline | Text | NoConnect | Junction;

export class KicadSch {
    version: number;
    generator: string;
    uuid: string;
    paper: Paper;
    title_block: TitleBlock;
    library_symbols: Map<string, LibrarySymbol> = new Map();
    wires: Map<string, Wire> = new Map();
    junctions: Map<string, Junction> = new Map();
    labels: Map<string, Label> = new Map();
    hierarchical_labels: Map<string, HierarchicalLabel> = new Map();
    symbols: Map<string, SymbolInstance> = new Map();
    graphics: Graphics[] = [];

    constructor(e: SExprParser) {
        // Note: this can either be a full schematic or a "fragment" from copying and
        // pasting.

        if (e.maybe_atom("kicad_sch")) {
            this.version = e.expect_pair_number("version");
            this.generator = e.expect_pair_atom("generator");
            this.uuid = e.expect_pair_atom("uuid");
            this.paper = new Paper(e.expect_expr("paper"));
            this.title_block = new TitleBlock(e.maybe_expr("title_block"));
        }

        const lib_symbols_list = e.maybe_expr("lib_symbols");
        let se;
        while ((se = lib_symbols_list.maybe_expr("symbol")) !== null) {
            const symbol = new LibrarySymbol(se);
            this.library_symbols.set(symbol.id, symbol);
        }

        while (e.element) {
            if ((se = e.maybe_expr("wire")) !== null) {
                const wire = new Wire(se);
                this.wires.set(wire.uuid, wire);
                continue;
            }
            if ((se = e.maybe_expr("junction")) !== null) {
                const junction = new Junction(se);
                this.junctions.set(junction.uuid, junction);
                continue;
            }
            if ((se = e.maybe_expr("polyline")) !== null) {
                this.graphics.push(new Polyline(se));
                continue;
            }
            if ((se = e.maybe_expr("label")) !== null) {
                const label = new Label(se);
                this.labels.set(label.uuid, label);
                continue;
            }
            if ((se = e.maybe_expr("hierarchical_label")) !== null) {
                const label = new HierarchicalLabel(se);
                this.hierarchical_labels.set(label.uuid, label);
                continue;
            }
            if ((se = e.maybe_expr("text")) !== null) {
                const text = new Text(null, se);
                this.graphics.push(text);
                continue;
            }
            if ((se = e.maybe_expr("no_connect")) !== null) {
                const nc = new NoConnect(se);
                this.graphics.push(nc);
                continue;
            }
            if ((se = e.maybe_expr("symbol")) !== null) {
                const symbol = new SymbolInstance(se, this.library_symbols);
                this.symbols.set(symbol.uuid, symbol);
                continue;
            }
            if ((se = e.maybe_expr("sheet_instances")) !== null) {
                // TODO: Ignored for now
                continue;
            }
            if ((se = e.maybe_expr("symbol_instances")) !== null) {
                // TODO: Ignored for now
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
    }

    *items() {
        for (const s of this.symbols.values()) {
            yield s;
        }
        for (const w of this.wires.values()) {
            yield w;
        }
        for (const j of this.junctions.values()) {
            yield j;
        }
        for (const l of this.labels.values()) {
            yield l;
        }
        for (const l of this.hierarchical_labels.values()) {
            yield l;
        }
        for (const g of this.graphics) {
            yield g;
        }
    }
}
