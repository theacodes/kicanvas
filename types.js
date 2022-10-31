/*
    References:
    - https://dev-docs.kicad.org/en/file-formats/sexpr-intro/
    - https://gitlab.com/edea-dev/edea/-/tree/main/edea
*/

export class At {
    constructor(e) {
        this.x = e.expect_number();
        this.y = e.expect_number();
        this.rotation = e.maybe_number() || 0;
    }
}

export class Paper {
    constructor(e) {
        this.size = e.maybe_string();
        this.width = e.maybe_number();
        this.height = e.maybe_number();
        this.portrait = e.maybe_atom("portrait") !== null;
    }
}

class TitleBlock {
    constructor(e) {
        const maybe_comment = () => {
            const ce = e.maybe_expr("comment");
            if (ce === null) {
                return null;
            }
            return ce.unbox(ce.elements[2]);
        };

        this.title = e.expect_pair_string("title");
        this.date = e.expect_pair_string("date");
        this.rev = e.expect_pair_string("rev");
        this.company = e.expect_pair_string("company");
        this.comment_1 = maybe_comment();
        this.comment_2 = maybe_comment();
        this.comment_3 = maybe_comment();
        this.comment_4 = maybe_comment();
        this.comment_5 = maybe_comment();
        this.comment_6 = maybe_comment();
        this.comment_7 = maybe_comment();
        this.comment_8 = maybe_comment();
        this.comment_9 = maybe_comment();
    }
}

export class Property {
    constructor(e, n) {
        this.n = n;
        this.key = e.expect_string();
        this.value = e.expect_string();
        this.id = e.expect_pair_number("id");
        this.at = new At(e.expect_expr("at"));
        const effects = e.maybe_expr("effects");
        this.effects = effects ? new Effects(effects) : null;
    }
}

function parse_color(e) {
    return `rgba(${e.expect_number()}, ${e.expect_number()}, ${e.expect_number()}, ${e.expect_number()})`;
}

export class Stroke {
    constructor(e) {
        this.width = e.expect_pair_number("width");
        this.type = e.expect_pair_atom("type");
        this.color = parse_color(e.expect_expr("color"));
    }
}

export class Effects {
    constructor(e) {
        const font = e.expect_expr("font");
        const font_size = font.expect_expr("size");
        this.size = {
            x: font_size.expect_number(),
            y: font_size.expect_number(),
        };
        this.thickness = font.maybe_pair_number("thickness");
        this.bold = font.maybe_atom("bold");
        this.italic = font.maybe_atom("italic");

        this.h_align = "center";
        this.v_align = "center";
        this.mirror = false;

        const justify = e.maybe_expr("justify");
        if (justify) {
            let t;
            while ((t = justify.maybe_atom()) !== null) {
                switch (t) {
                    case "left":
                        this.h_align = "left";
                        break;
                    case "right":
                        this.h_align = "right";
                        break;
                    case "top":
                        this.v_align = "top";
                        break;
                    case "bottom":
                        this.v_align = "bottom";
                        break;
                    case "mirror":
                        this.mirror = true;
                        break;
                    default:
                        break;
                }
            }
        }

        this.hide = e.maybe_atom("hide") ? true : false;
    }
}

function parse_points(e) {
    const pts = [];
    e = e.expect_expr("pts");
    let c;
    while ((c = e.maybe_expr("xy")) !== null) {
        pts.push({ x: c.expect_number(), y: c.expect_number() });
    }
    return pts;
}

export class Rectangle {
    constructor(e) {
        const start = e.expect_expr("start");
        this.start = { x: start.expect_number(), y: start.expect_number() };
        const end = e.expect_expr("end");
        this.end = { x: end.expect_number(), y: end.expect_number() };
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.expect_expr("fill").expect_pair_atom("type");
    }
}

export class Polyline {
    constructor(e) {
        this.pts = parse_points(e);
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.maybe_expr("fill")?.expect_pair_atom("type");
    }
}

export class Circle {
    constructor(e) {
        const center = e.expect_expr("center");
        this.center = { x: center.expect_number(), y: center.expect_number() };
        this.radius = e.expect_pair_number("radius");
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.expect_expr("fill").expect_pair_atom("type");
    }
}

export class Arc {
    constructor(e) {
        const start = e.expect_expr("start");
        this.start = { x: start.expect_number(), y: start.expect_number() };
        const mid = e.expect_expr("mid");
        this.mid = { x: mid.expect_number(), y: mid.expect_number() };
        const end = e.expect_expr("end");
        this.end = { x: end.expect_number(), y: end.expect_number() };
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.fill = e.expect_expr("fill").expect_pair_atom("type");
    }
}

export class PinDefinition {
    constructor(e) {
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
    constructor(e) {
        this.id = e.expect_string();
        this.power = e.maybe_expr("power") !== null;
        this.hide_pin_numbers = e.maybe_pair_atom("pin_numbers") === "hide";
        const pin_names = e.maybe_expr("pin_names");
        this.pin_name_offset = pin_names?.maybe_pair_number("offset") || 0.508;
        this.hide_pin_names = pin_names ? pin_names.maybe_atom("hide") !== null : false;
        this.in_bom = e.maybe_pair_atom("in_bom") === "yes";
        this.on_board = e.maybe_pair_atom("on_board") === "yes";

        this.properties = {};
        this.children = {};
        this.graphics = [];
        this.pins = {};

        while (e.element) {
            let se;
            if ((se = e.maybe_expr("property")) !== null) {
                const p = new Property(se, Object.values(this.properties).length);
                this.properties[p.key] = p;
                continue;
            }
            if ((se = e.maybe_expr("symbol")) !== null) {
                const s = new LibrarySymbol(se);
                this.children[s.id] = s;
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
            if ((se = e.maybe_expr("pin")) !== null) {
                const p = new PinDefinition(se);
                this.pins[p.number] = p;
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
    }
}

export class PinInstance {
    constructor(e) {
        this.name = e.expect_string();
        this.id = e.expect_pair_atom("uuid");
    }
}

export class SymbolInstance {
    constructor(e) {
        this.lib_id = e.expect_pair_string("lib_id");
        this.at = new At(e.expect_expr("at"));
        this.mirror = e.maybe_pair_atom("mirror");
        this.unit = e.maybe_pair_any("unit");
        this.in_bom = e.maybe_pair_atom("in_bom") === "yes";
        this.on_board = e.maybe_pair_atom("on_board") === "yes";
        this.fields_autoplaced = e.maybe_expr("fields_autoplaced") !== null;
        this.id = e.expect_pair_atom("uuid");

        this.properties = {};
        this.pins = {};

        while (e.element) {
            let se;
            if ((se = e.maybe_expr("property")) !== null) {
                const p = new Property(se, Object.values(this.properties).length);
                this.properties[p.key] = p;
                continue;
            }
            if ((se = e.maybe_expr("pin")) !== null) {
                const p = new PinInstance(se);
                this.pins[p.name] = p;
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
    }
}

export class Wire {
    constructor(e) {
        this.pts = parse_points(e);
        this.stroke = new Stroke(e.expect_expr("stroke"));
        this.id = e.expect_pair_atom("uuid");
    }
}

export class Junction {
    constructor(e) {
        this.at = new At(e.expect_expr("at"));
        this.diameter = e.expect_pair_number("diameter");
        this.color = parse_color(e.expect_expr("color"));
        this.id = e.expect_pair_atom("uuid");
    }
}

export class Label {
    constructor(e) {
        this.name = e.expect_string();
        this.at = new At(e.expect_expr("at"));
        this.effects = new Effects(e.expect_expr("effects"));
        this.id = e.expect_pair_atom("uuid");
    }
}

export class Text {
    constructor(e) {
        this.text = e.expect_string();
        this.at = new At(e.expect_expr("at"));
        this.effects = new Effects(e.expect_expr("effects"));
        this.id = e.expect_pair_atom("uuid");
    }
}

export class KicadSch {
    constructor(e) {
        e.expect_atom("kicad_sch");

        this.version = e.expect_pair_number("version");
        this.generator = e.expect_pair_atom("generator");
        this.uuid = e.expect_pair_atom("uuid");
        this.paper = new Paper(e.expect_expr("paper"));
        this.title_block = new TitleBlock(e.expect_expr("title_block"));

        this.lib_symbols = {};
        const lib_symbols_list = e.maybe_expr("lib_symbols");
        let se;
        while ((se = lib_symbols_list.maybe_expr("symbol")) !== null) {
            const symbol = new LibrarySymbol(se);
            this.lib_symbols[symbol.id] = symbol;
        }

        this.wires = {};
        this.junctions = {};
        this.graphics = [];
        this.labels = {};
        this.symbols = {};

        while (e.element) {
            if ((se = e.maybe_expr("wire")) !== null) {
                const wire = new Wire(se);
                this.wires[wire.id] = wire;
                continue;
            }
            if ((se = e.maybe_expr("junction")) !== null) {
                const junction = new Junction(se);
                this.junctions[junction.id] = junction;
                continue;
            }
            if ((se = e.maybe_expr("polyline")) !== null) {
                this.graphics.push(new Polyline(se));
                continue;
            }
            if ((se = e.maybe_expr("label")) !== null) {
                const label = new Label(se);
                this.labels[label.id] = label;
                continue;
            }
            if ((se = e.maybe_expr("text")) !== null) {
                const text = new Text(se);
                this.graphics.push(text);
                continue;
            }
            if ((se = e.maybe_expr("symbol")) !== null) {
                const symbol = new SymbolInstance(se);
                symbol.lib_symbol = this.lib_symbols[symbol.lib_id];
                this.symbols[symbol.id] = symbol;
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
    }

    *iter_graphics() {
        for (const g of this.graphics) {
            yield g;
        }
        for (const w of Object.values(this.wires)) {
            yield w;
        }
        for (const j of Object.values(this.junctions)) {
            yield j;
        }
        for (const l of Object.values(this.labels)) {
            yield l;
        }
        for (const s of Object.values(this.symbols)) {
            yield s;
        }
    }
}
