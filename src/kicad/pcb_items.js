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

import { Vec2 } from "../math/vec2.js";

export class At {
    constructor(e) {
        this.position = new Vec2(e.expect_number(), e.expect_number());
        this.rotation = e.maybe_number() ?? 0;
        this.unlocked = e.maybe_atom("unlocked") ? true : false;
    }
}

export class Segment {
    constructor(e) {
        this.start = e.expect_vec2("start");
        this.end = e.expect_vec2("end");
        this.width = e.expect_pair_number("width");
        this.layer = e.expect_pair_string("layer");
        this.net = e.expect_pair_number("net");
    }
}

export class Arc {
    constructor(e) {
        this.start = e.expect_vec2("start");
        this.mid = e.expect_vec2("mid");
        this.end = e.expect_vec2("end");
        this.width = e.expect_pair_number("width");
        this.layer = e.expect_pair_string("layer");
        this.net = e.expect_pair_number("net");
    }
}

export class Polygon {
    constructor(e) {
        this.pts = e.expect_vec2_list("pts");
    }
}

export class FilledPolygon {
    constructor(e) {
        this.layer = e.expect_pair_string("layer");
        this.pts = e.expect_vec2_list("pts");
    }
}

export class Zone {
    constructor(e) {
        this.net = e.expect_pair_number("net");
        this.net_name = e.expect_pair_string("net_name");

        const layer = e.maybe_pair_string("layer");
        if (layer) {
            this.layers = [layer];
        } else {
            const layers = e.maybe_pair_atom("layers");
            if (layers == "F&B.Cu") {
                this.layers = ["F.Cu", "B.Cu"];
            } else {
                this.layers = Array.from(e.expect_expr("layers").rest());
            }
        }

        this.tstamp = e.expect_pair_atom("tstamp");
        this.hatch = e.maybe_expr("hatch");
        this.priority = e.maybe_pair_number("priority") ?? 0;
        this.connect_pads = e.expect_expr("connect_pads");
        this.min_thickness = e.expect_pair_number("min_thickness");
        this.filled_areas_thickness = e.maybe_expr("filled_areas_thickness");
        this.keepout = e.maybe_expr("keepout");
        this.fill = e.expect_expr("fill");
        this.polygon = new Polygon(e.expect_expr("polygon"));

        this.filled_polygons = [];

        while (e.element) {
            this.filled_polygons.push(
                new FilledPolygon(e.expect_expr("filled_polygon"))
            );
        }
    }
}

export class Via {
    constructor(e) {
        if (e.maybe_atom("blind")) {
            this.type = "blind";
        } else if (e.maybe_atom("buried")) {
            this.type = "buried";
        } else if (e.maybe_atom("micro")) {
            this.type = "micro";
        } else {
            this.type = "through-hole";
        }

        this.locked = e.maybe_expr("locked") ? true : false;

        this.at = e.expect_vec2("at");
        this.size = e.expect_pair_number("size");
        this.drill = e.expect_pair_number("drill");
        this.layers = Array.from(e.expect_expr("layers").rest());
        this.free = e.maybe_expr("free") ? true : false;
        this.net = e.expect_pair_number("net");
        this.tstamp = e.expect_pair_atom("tstamp");
    }
}

export class GrLine {
    constructor(e) {
        this.start = e.expect_vec2("start");
        this.end = e.expect_vec2("end");
        this.layer = e.maybe_pair_string("layer");
        this.width = e.expect_pair_number("width");
    }
}

export class FpLine {
    constructor(parent, e) {
        this.parent = parent;
        this.start = e.expect_vec2("start");
        this.end = e.expect_vec2("end");
        this.layer = e.expect_pair_string("layer");
        this.width = e.expect_pair_number("width");
    }
}

export class GrRect {
    constructor(e) {
        this.locked = e.maybe_atom("locked") ? true : false;
        this.start = e.expect_vec2("start");
        this.end = e.expect_vec2("end");
        this.layer = e.maybe_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.fill = e.maybe_pair_atom("fill") == "solid" ? true : false;
    }
}

export class FpRect {
    constructor(parent, e) {
        this.parent = parent;
        this.start = e.expect_vec2("start");
        this.end = e.expect_vec2("end");
        this.layer = e.expect_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.fill = e.maybe_pair_atom("fill") == "solid" ? true : false;
    }
}

export class GrArc {
    constructor(e) {
        this.start = e.expect_vec2("start");
        this.mid = e.expect_vec2("mid");
        this.end = e.expect_vec2("end");
        this.layer = e.maybe_pair_string("layer");
        this.width = e.expect_pair_number("width");
    }
}

export class FpArc {
    constructor(parent, e) {
        this.parent = parent;
        this.start = e.expect_vec2("start");
        this.mid = e.expect_vec2("mid");
        this.end = e.expect_vec2("end");
        this.layer = e.expect_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.locked = e.maybe_atom("locked") ? true : false;
        this.tstamp = e.maybe_pair_atom("tstamp");
    }
}

export class FpPoly {
    constructor(parent, e) {
        this.parent = parent;
        this.pts = e.expect_vec2_list("pts");
        this.layer = e.expect_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.fill = e.maybe_pair_atom("fill") == "solid" ? true : false;
        this.locked = e.maybe_atom("locked") ? true : false;
        this.tstamp = e.maybe_pair_atom("tstamp");
    }
}

export class GrPoly {
    constructor(e) {
        this.pts = e.expect_vec2_list("pts");
        this.layer = e.maybe_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.fill = ["solid", "yes"].includes(e.maybe_pair_atom("fill"));
        this.locked = e.maybe_atom("locked") ? true : false;
        this.tstamp = e.maybe_pair_atom("tstamp");
    }
}

export class GrCircle {
    constructor(e) {
        this.center = e.expect_vec2("center");
        this.end = e.expect_vec2("end");
        this.layer = e.maybe_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.fill = e.maybe_pair_atom("fill") == "solid" ? true : false;
        this.locked = e.maybe_atom("locked") ? true : false;
        this.tstamp = e.maybe_pair_atom("tstamp");
    }
}

export class FpCircle {
    constructor(parent, e) {
        this.parent = parent;
        this.center = e.expect_vec2("center");
        this.end = e.expect_vec2("end");
        this.layer = e.expect_pair_string("layer");
        this.width = e.expect_pair_number("width");
        this.fill = e.maybe_pair_atom("fill") == "solid" ? true : false;
        this.locked = e.maybe_atom("locked") ? true : false;
        this.tstamp = e.maybe_pair_atom("tstamp");
    }
}

export class Effects {
    constructor(e = undefined) {
        if (!e) {
            return;
        }
        const font = e.expect_expr("font");
        const font_size = font.expect_expr("size");
        this.size = new Vec2(
            font_size.expect_number(),
            font_size.expect_number()
        );
        this.thickness = font.maybe_pair_number("thickness");
        this.bold = font.maybe_atom("bold") || false;
        this.italic = font.maybe_atom("italic") || false;

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

        if (this.size.x == 0 || this.size.y == 0) {
            this.hide = true;
        }
    }

    static default() {
        const e = new Effects();
        e.size = { x: 1.27, y: 1.27 };
        e.bold = false;
        e.italic = false;
        e.h_align = "center";
        e.v_align = "center";
        e.mirror = false;
        e.hide = false;
    }

    copy() {
        const e = new Effects();
        Object.assign(e, window.structuredClone(this));
        return e;
    }
}

export class GrText {
    constructor(e) {
        this.text = e.expect_string();
        this.at = new At(e.expect_expr("at"));
        this.layer = e.expect_pair_string("layer");
        this.tstamp = e.maybe_pair_atom("tstamp");
        this.effects = new Effects(e.expect_expr("effects"));
    }
}

export class FpText {
    constructor(parent, e) {
        this.parent = parent;
        this.type = e.expect_atom();
        this.text = e.expect_string();
        this.at = new At(e.expect_expr("at"));
        this.unlocked = e.maybe_atom("unlocked") ? true : false;
        this.layer = e.expect_pair_string("layer");
        this.hide = e.maybe_atom("hide") ? true : false;
        this.effects = new Effects(e.expect_expr("effects"));
        this.tstamp = e.maybe_pair_atom("tstamp");
    }
}

export class DimensionFormat {
    constructor(e) {
        this.prefix = e.maybe_pair_string("prefix");
        this.suffix = e.maybe_pair_string("suffix");
        this.units = e.expect_pair_number("units");
        this.units_format = e.expect_pair_number("units_format");
        this.precision = e.expect_pair_number("precision");
        this.override_value = e.maybe_pair_string("override_value");
        this.suppress_zeros = e.maybe_atom("suppress_zeros") ? true : false;
    }
}

export class DimensionStyle {
    constructor(e) {
        this.thickness = e.expect_pair_number("thickness");
        this.arrow_length = e.expect_pair_number("arrow_length");
        this.text_position_mode = e.expect_pair_number("text_position_mode");
        this.extension_height = e.maybe_pair_number("extension_height");
        this.text_frame = e.maybe_pair_number("text_frame");
        this.extension_offset = e.maybe_pair_number("extension_offset");
        this.keep_text_aligned = e.maybe_atom("suppress_zeros") ? true : false;
    }
}

export class Dimension {
    constructor(e) {
        this.locked = e.maybe_atom("locked") ? true : false;
        this.type = e.expect_pair_atom("type");
        this.layer = e.expect_pair_string("layer");
        this.tstamp = e.expect_pair_atom("tstamp");

        let pts = e.expect_vec2_list("pts");
        this.start = pts[0];
        this.end = pts[1];
        this.height = e.maybe_pair_number("height") ?? 0;
        this.orientation = e.maybe_pair_number("orientation") ?? 0;

        let se;
        if ((se = e.maybe_expr("gr_text")) !== null) {
            this.text = new GrText(se);
        }

        if ((se = e.maybe_expr("format")) !== null) {
            this.format = new DimensionFormat(se);
        }

        this.style = new DimensionStyle(e.expect_expr("style"));
    }
}

export class Layer {
    constructor(e) {
        this.ordinal = e.expect_number();
        this.name = e.expect_string();
        this.type = e.expect_atom();
        this.user_name = e.maybe_string() ?? this.name;

        this.items = [];
    }
}

export class Drill {
    constructor(e) {
        this.oval = e.maybe_atom("oval") ? true : false;
        this.diameter = e.expect_number();
        this.width = e.maybe_number();
        const offset = e.maybe_expr("offset");
        if (offset) {
            this.offset = new Vec2(
                offset.expect_number(),
                offset.expect_number()
            );
        } else {
            this.offset = new Vec2(0, 0);
        }
    }
}

export class PadOptions {
    constructor(e) {
        this.clearance = e.expect_pair_atom("clearance");
        this.anchor = e.expect_pair_atom("anchor");
    }
}

export class Pad {
    constructor(parent, e) {
        this.parent = parent;
        this.number = e.expect_string();
        this.type = e.expect_atom();
        this.shape = e.expect_atom();
        this.locked = e.maybe_atom("locked") ? true : false;
        this.at = new At(e.expect_expr("at"));
        this.size = e.expect_vec2("size");

        const drill = e.maybe_expr("drill");
        this.drill = drill ? new Drill(drill) : null;

        this.rect_delta = e.maybe_vec2("rect_delta");
        this.layers = Array.from(e.expect_expr("layers").rest());
        this.roundrect_rratio = e.maybe_pair_number("roundrect_rratio");
        this.chamfer_ratio = e.maybe_pair_number("chamfer_ratio");
        this.chamfer = e.maybe_expr("chamfer");
        const net = e.maybe_expr("net");
        if (net) {
            this.net = {
                number: net.expect_number(),
                name: net.expect_string(),
            };
        }
        this.pinfunction = e.maybe_pair_string("pinfunction");
        this.pintype = e.maybe_pair_string("pintype");
        this.solder_mask_margin = e.maybe_pair_number("solder_mask_margin");
        this.solder_paste_margin = e.maybe_pair_number("solder_paste_margin");
        this.solder_paste_margin_ratio = e.maybe_pair_number(
            "solder_paste_margin_ratio"
        );
        this.clear = e.maybe_pair_number("clearance");
        this.thermal_width = e.maybe_pair_number("thermal_width");
        this.thermal_gap = e.maybe_pair_number("thermal_gap");
        this.zone_connect = e.maybe_pair_number("zone_connect");
        const options = e.maybe_expr("options");
        if (options) {
            this.options = new PadOptions(options);
        }

        let prims = e.maybe_expr("primitives");

        if (prims) {
            this.primitives = [];
            let se;
            while (prims.element) {
                if ((se = prims.maybe_expr("gr_circle")) !== null) {
                    this.primitives.push(new GrCircle(se));
                    continue;
                } else if ((se = prims.maybe_expr("gr_arc")) !== null) {
                    this.primitives.push(new GrArc(se));
                    continue;
                } else if ((se = prims.maybe_expr("gr_rect")) !== null) {
                    this.primitives.push(new GrRect(se));
                    continue;
                } else if ((se = prims.maybe_expr("gr_poly")) !== null) {
                    this.primitives.push(new GrPoly(se));
                    continue;
                } else if ((se = prims.maybe_expr("gr_line")) !== null) {
                    this.primitives.push(new GrLine(se));
                    continue;
                }
            }
        }

        this.tstamp = e.expect_pair_atom("tstamp");
    }
}

export class Model {
    constructor(e) {
        this.filename = e.expect_string();
        for (const name in ["at", "scale", "rotation"]) {
            let se = e.maybe_expr(name);
            if (!se) {
                this[name] = { x: 0, y: 0, z: 0 };
            } else {
                se = se.expect_expr("xyz");
                this[name] = {
                    x: se.expect_number(),
                    y: se.expect_number(),
                    z: se.expect_number(),
                };
            }
        }
    }
}

export class Footprint {
    constructor(pcb, e) {
        this.library_link = e.expect_string();
        this.version = e.maybe_pair_number("version");
        this.generator = e.maybe_pair_atom("generator");
        this.locked = e.maybe_atom("locked") ? true : false;
        this.placed = e.maybe_atom("placed") ? true : false;
        this.layer = e.expect_pair_string("layer");
        this.tedit = e.expect_pair("tedit");
        this.tstamp = e.maybe_pair_atom("tstamp");
        this.at = new At(e.expect_expr("at"));
        this.descr = e.maybe_pair_string("descr");
        this.tags = e.maybe_pair_string("tags");

        this.properties = {};

        let pe = null;
        while ((pe = e.maybe_expr("property"))) {
            this.properties[pe.expect_string()] = pe.expect_string();
        }

        this.path = e.maybe_pair_string("path");
        this.autoplace_cost90 = e.maybe_pair_number("autoplace_cost90");
        this.autoplace_cost180 = e.maybe_pair_number("autoplace_cost180");
        this.solder_mask_margin = e.maybe_pair_number("solder_mask_margin");
        this.solder_paste_margin = e.maybe_pair_number("solder_paste_margin");
        this.solder_paste_ratio = e.maybe_pair_number("solder_paste_ratio");
        this.clearance = e.maybe_pair_number("clearance");
        this.zone_connect = e.maybe_pair_number("zone_connect");
        this.thermal_width = e.maybe_pair_number("thermal_width");
        this.thermal_gap = e.maybe_pair_number("thermal_gap");
        this.attr = Array.from(e.expect_expr("attr").rest());

        this.models = [];
        this.items = [];

        let se;
        while (e.element) {
            if ((se = e.maybe_expr("fp_text")) !== null) {
                const text = new FpText(this, se);
                text.text = pcb.expand_text_vars(text.text, this);
                this.items.push(text);

                if (text.type == "reference") {
                    this.properties["reference"] = text.text;
                } else if (text.type == "value") {
                    this.properties["value"] = text.text;
                }

                continue;
            } else if ((se = e.maybe_expr("fp_poly")) !== null) {
                this.items.push(new FpPoly(this, se));
                continue;
            } else if ((se = e.maybe_expr("fp_line")) !== null) {
                this.items.push(new FpLine(this, se));
                continue;
            } else if ((se = e.maybe_expr("fp_rect")) !== null) {
                this.items.push(new FpRect(this, se));
                continue;
            } else if ((se = e.maybe_expr("fp_circle")) !== null) {
                this.items.push(new FpCircle(this, se));
                continue;
            } else if ((se = e.maybe_expr("fp_arc")) !== null) {
                this.items.push(new FpArc(this, se));
                continue;
            } else if ((se = e.maybe_expr("pad")) !== null) {
                this.items.push(new Pad(this, se));
                continue;
            } else if ((se = e.maybe_expr("model")) !== null) {
                this.models.push(new Model(se));
                continue;
            } else if ((se = e.maybe_expr("zone")) !== null) {
                this.items.push(new Zone(se));
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
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
        this.rev = e.maybe_pair_string("rev");
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

    get text_vars() {
        return {
            ISSUE_DATE: this.date,
            DATE: this.date,
            REVISION: this.rev,
            TITLE: this.title,
            COMPANY: this.company,
            COMMENT1: this.comment_1,
            COMMENT2: this.comment_2,
            COMMENT3: this.comment_3,
            COMMENT4: this.comment_4,
            COMMENT5: this.comment_5,
            COMMENT6: this.comment_6,
            COMMENT7: this.comment_7,
            COMMENT8: this.comment_8,
            COMMENT9: this.comment_9,
        };
    }
}

class StackupLayer {
    constructor(e) {
        this.name = e.expect_string();
        this.type = e.expect_pair_string("type");
        this.color = e.maybe_pair_string("color");
        this.thickness = e.maybe_pair_number("thickness");
        this.material = e.maybe_pair_string("material");
        this.epsilon_r = e.maybe_pair_number("epsilon_r");
        this.loss_tangent = e.maybe_pair_number("loss_tangent");
    }
}

class Stackup {
    constructor(e) {
        this.layers = [];

        let se;

        while ((se = e.maybe_expr("layer")) !== null) {
            this.layers.push(new StackupLayer(se));
        }

        this.copper_finish = e.maybe_pair_string("copper_finish");
        this.dielectric_constraints =
            e.maybe_pair_atom("dielectric_constraints") == "yes" ? true : false;
        this.edge_connector = e.maybe_pair_atom("edge_connector");
        this.castellated_pads =
            e.maybe_pair_atom("castellated_pads") == "yes" ? true : false;
        this.edge_plating =
            e.maybe_pair_atom("edge_plating") == "yes" ? true : false;
    }
}

class PcbPlotParams {
    constructor(e) {
        this.layerselection = e.expect_pair_number("layerselection");
        this.disableapertmacros =
            e.expect_pair_atom("disableapertmacros") == "true" ? true : false;
        this.usegerberextensions =
            e.expect_pair_atom("usegerberextensions") == "true" ? true : false;
        this.usegerberattributes =
            e.expect_pair_atom("usegerberattributes") == "true" ? true : false;
        this.usegerberadvancedattributes =
            e.expect_pair_atom("usegerberadvancedattributes") == "true"
                ? true
                : false;
        this.creategerberjobfile =
            e.expect_pair_atom("creategerberjobfile") == "true" ? true : false;
        this.gerberprecision =
            e.maybe_pair_number("gerberprecision") == "true" ? true : false;
        this.svguseinch =
            e.expect_pair_atom("svguseinch") == "true" ? true : false;
        this.svgprecision = e.expect_pair_number("svgprecision");
        this.excludeedgelayer =
            e.expect_pair_atom("excludeedgelayer") == "true" ? true : false;
        this.plotframeref =
            e.expect_pair_atom("plotframeref") == "true" ? true : false;
        this.viasonmask =
            e.expect_pair_atom("viasonmask") == "true" ? true : false;
        this.mode = e.expect_pair_number("mode");
        this.useauxorigin =
            e.expect_pair_atom("useauxorigin") == "true" ? true : false;
        this.hpglpennumber = e.expect_pair_number("hpglpennumber");
        this.hpglpenspeed = e.expect_pair_number("hpglpenspeed");
        this.hpglpendiameter = e.expect_pair_number("hpglpendiameter");
        this.dxfpolygonmode =
            e.expect_pair_atom("dxfpolygonmode") == "true" ? true : false;
        this.dxfimperialunits =
            e.expect_pair_atom("dxfimperialunits") == "true" ? true : false;
        this.dxfusepcbnewfont =
            e.expect_pair_atom("dxfusepcbnewfont") == "true" ? true : false;
        this.psnegative =
            e.expect_pair_atom("psnegative") == "true" ? true : false;
        this.psa4output =
            e.expect_pair_atom("psa4output") == "true" ? true : false;
        this.plotreference =
            e.expect_pair_atom("plotreference") == "true" ? true : false;
        this.plotvalue =
            e.expect_pair_atom("plotvalue") == "true" ? true : false;
        this.plotinvisibletext =
            e.expect_pair_atom("plotinvisibletext") == "true" ? true : false;
        this.sketchpadsonfab =
            e.expect_pair_atom("sketchpadsonfab") == "true" ? true : false;
        this.subtractmaskfromsilk =
            e.expect_pair_atom("subtractmaskfromsilk") == "true" ? true : false;
        this.outputformat = e.expect_pair_number("outputformat");
        this.mirror = e.expect_pair_atom("mirror") == "true" ? true : false;
        this.drillshape = e.expect_pair_number("drillshape");
        this.scaleselection = e.expect_pair_number("scaleselection");
        this.outputdirectory = e.expect_pair_string("outputdirectory");
    }
}

class Setup {
    constructor(e) {
        let se;

        if ((se = e.maybe_expr("stackup")) !== null) {
            this.stackup = new Stackup(se);
        }

        this.pad_to_mask_clearance = e.expect_pair_number(
            "pad_to_mask_clearance"
        );
        this.solder_mask_min_width =
            e.maybe_pair_number("solder_mask_min_width") ?? 0;
        this.pad_to_paste_clearance =
            e.maybe_pair_number("pad_to_paste_clearance") ?? 0;
        this.pad_to_paste_clearance_ratio =
            e.maybe_pair_number("pad_to_paste_clearance_ratio") ?? 100;
        this.aux_axis_origin = e.maybe_vec2("aux_axis_origin");
        this.grid_origin = e.maybe_vec2("grid_origin");

        if ((se = e.maybe_expr("pcbplotparams")) !== null) {
            this.pcbplotparams = new PcbPlotParams(se);
        }
    }
}

export class KicadPCB {
    constructor(e) {
        this.layers = {};
        this.footprints = [];
        this.properties = {};
        this.items = [];

        let se;

        e.expect_atom("kicad_pcb");
        this.version = e.expect_pair_number("version");
        this.generator = e.expect_pair_atom("generator");

        if ((se = e.maybe_expr("general")) !== null) {
            this.thickness = se.expect_pair_number("thickness");
        }
        if ((se = e.maybe_expr("paper")) !== null) {
            this.paper = new Paper(se);
        }
        if ((se = e.maybe_expr("title_block")) !== null) {
            this.title_block = new TitleBlock(se);
        }
        if ((se = e.maybe_expr("layers")) !== null) {
            while (se.element) {
                const layer = new Layer(se.expect_list());
                this.layers[layer.name] = layer;
            }
        }
        if ((se = e.maybe_expr("setup")) !== null) {
            while (se.element) {
                this.setup = new Setup(se);
            }
        }

        while (e.element) {
            if ((se = e.maybe_expr("property")) !== null) {
                this.properties[se.expect_string()] = se.expect_string();
                continue;
            }
            if ((se = e.maybe_expr("net")) !== null) {
                // TODO
                continue;
            } else if ((se = e.maybe_expr("segment")) !== null) {
                const seg = new Segment(se);
                // this.layers[seg.layer].items.push(seg);
                this.items.push(seg);
                continue;
            } else if ((se = e.maybe_expr("arc")) !== null) {
                const arc = new Arc(se);
                // this.layers[arc.layer].items.push(arc);
                this.items.push(arc);
                continue;
            } else if ((se = e.maybe_expr("zone")) !== null) {
                const zone = new Zone(se);
                this.items.push(zone);
                continue;
            } else if ((se = e.maybe_expr("via")) !== null) {
                const via = new Via(se);
                this.items.push(via);
                continue;
            } else if ((se = e.maybe_expr("gr_text")) !== null) {
                const text = new GrText(se);
                text.original_text = text.text;
                text.text = this.expand_text_vars(text.text);
                this.items.push(text);
                continue;
            } else if ((se = e.maybe_expr("gr_circle")) !== null) {
                const circle = new GrCircle(se);
                this.items.push(circle);
                continue;
            } else if ((se = e.maybe_expr("gr_arc")) !== null) {
                const arc = new GrArc(se);
                this.items.push(arc);
                continue;
            } else if ((se = e.maybe_expr("gr_rect")) !== null) {
                const rect = new GrRect(se);
                this.items.push(rect);
                continue;
            } else if ((se = e.maybe_expr("gr_poly")) !== null) {
                const poly = new GrPoly(se);
                this.items.push(poly);
                continue;
            } else if ((se = e.maybe_expr("gr_line")) !== null) {
                const line = new GrLine(se);
                this.items.push(line);
                continue;
            } else if ((se = e.maybe_expr("dimension")) !== null) {
                const dim = new Dimension(se);
                this.items.push(dim);
                continue;
            } else if ((se = e.maybe_expr("footprint")) !== null) {
                const fp = new Footprint(this, se);
                // this.footprints.push(fp);
                this.items.push(fp);
                continue;
            }
            console.log("unknown", e.element);
            break;
        }
    }

    expand_text_vars(text, context) {
        const vars = {};
        Object.assign(
            vars,
            this.title_block?.text_vars ?? {},
            this.properties,
            context?.properties ?? {}
        );

        for (let [k, v] of Object.entries(vars)) {
            text = text.replace("${" + k.toUpperCase() + "}", v);
        }

        const escape_vars = {
            dblquote: '"',
        };

        for (let [k, v] of Object.entries(escape_vars)) {
            text = text.replace("{" + k + "}", v);
        }

        return text;
    }
}
