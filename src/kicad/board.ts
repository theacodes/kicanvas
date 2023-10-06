/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Arc as MathArc, Matrix3, Vec2 } from "../base/math";
import type { Project } from "../kicanvas/project";
import {
    At,
    Effects,
    Paper,
    Stroke,
    TitleBlock,
    expand_text_vars,
} from "./common";
import { P, T, parse_expr, type Parseable } from "./parser";
import type { List } from "./tokenizer";

export type Drawing =
    | GrLine
    | GrCircle
    | GrArc
    | GrPoly
    | GrRect
    | GrText
    | Dimension;

export class KicadPCB {
    project?: Project;
    version: number;
    generator?: string;
    general?: { thickness: number };
    paper?: Paper;
    title_block = new TitleBlock();
    setup?: Setup;
    properties = new Map<string, Property>();
    layers: Layer[] = [];
    nets: Net[] = [];
    footprints: Footprint[] = [];
    zones: Zone[] = [];
    segments: (LineSegment | ArcSegment)[] = [];
    vias: Via[] = [];
    drawings: Drawing[] = [];
    groups: Group[] = [];

    constructor(
        public filename: string,
        expr: Parseable,
    ) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("kicad_pcb"),
                P.pair("version", T.number),
                P.pair("generator", T.string),
                P.object("general", {}, P.pair("thickness", T.number)),
                P.item("paper", Paper),
                P.item("title_block", TitleBlock),
                P.list("layers", T.item(Layer)),
                P.item("setup", Setup),
                P.mapped_collection(
                    "properties",
                    "property",
                    (p: Property) => p.name,
                    T.item(Property, this),
                ),
                P.collection("nets", "net", T.item(Net)),
                P.collection(
                    "footprints",
                    "footprint",
                    T.item(Footprint, this),
                ),
                P.collection("zones", "zone", T.item(Zone)),
                P.collection("segments", "segment", T.item(LineSegment)),
                P.collection("segments", "arc", T.item(ArcSegment)),
                P.collection("vias", "via", T.item(Via)),
                P.collection("drawings", "dimension", T.item(Dimension, this)),
                P.collection("drawings", "gr_line", T.item(GrLine)),
                P.collection("drawings", "gr_circle", T.item(GrCircle)),
                P.collection("drawings", "gr_arc", T.item(GrArc)),
                P.collection("drawings", "gr_poly", T.item(GrPoly)),
                P.collection("drawings", "gr_rect", T.item(GrRect)),
                P.collection("drawings", "gr_text", T.item(GrText, this)),
                P.collection("groups", "group", T.item(Group)),
            ),
        );
    }

    *items() {
        yield* this.drawings;
        yield* this.vias;
        yield* this.segments;
        yield* this.zones;
        yield* this.footprints;
    }

    resolve_text_var(name: string): string | undefined {
        if (name == "FILENAME") {
            return this.filename;
        }

        if (this.properties.has(name)) {
            return this.properties.get(name)!.value;
        }

        return this.title_block.resolve_text_var(name);
    }

    get edge_cuts_bbox(): BBox {
        let bbox = new BBox(0, 0, 0, 0);
        for (const item of this.drawings) {
            if (item.layer != "Edge.Cuts" || !(item instanceof GraphicItem)) {
                continue;
            }
            bbox = BBox.combine([bbox, item.bbox]);
        }
        return bbox;
    }

    find_footprint(uuid_or_ref: string) {
        for (const fp of this.footprints) {
            if (fp.uuid == uuid_or_ref || fp.reference == uuid_or_ref) {
                return fp;
            }
        }
        return null;
    }
}

export class Property {
    name: string;
    value: string;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("property"),
                P.positional("name", T.string),
                P.positional("value", T.string),
            ),
        );
    }
}

export class LineSegment {
    start: Vec2;
    end: Vec2;
    width: number;
    layer: string;
    net: number;
    locked = false;
    tstamp: string;

    constructor(expr: Parseable) {
        /*
        (segment
            (start 119.1 82.943)
            (end 120.0075 82.943)
            (width 0.5)
            (layer "F.Cu")
            (net 1)
            (tstamp 0766ea9a-c430-4922-b68d-6ad9f33e6672))
        */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("segment"),
                P.vec2("start"),
                P.vec2("end"),
                P.pair("width", T.number),
                P.pair("layer", T.string),
                P.pair("net", T.number),
                P.atom("locked"),
                P.pair("tstamp", T.string),
            ),
        );
    }
}

export class ArcSegment {
    start: Vec2;
    mid: Vec2;
    end: Vec2;
    width: number;
    layer: string;
    net: number;
    locked = false;
    tstamp: string;

    constructor(expr: Parseable) {
        /*
        (arc
            (start 115.25 59.05)
            (mid 115.301256 58.926256)
            (end 115.425 58.875)
            (width 0.3)
            (layer "F.Cu")
            (net 1)
            (tstamp 1c993ada-29b1-41b2-8ac1-a7f99ad99281))
        */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("arc"),
                P.vec2("start"),
                P.vec2("mid"),
                P.vec2("end"),
                P.pair("width", T.number),
                P.pair("layer", T.string),
                P.pair("net", T.number),
                P.atom("locked"),
                P.pair("tstamp", T.string),
            ),
        );
    }
}

export class Via {
    type: "blind" | "micro" | "through-hole" = "through-hole";
    at: At;
    size: number;
    drill: number;
    layers: string[];
    remove_unused_layers = false;
    keep_end_layers = false;
    locked = false;
    free = false;
    net: number;
    tstamp: string;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("via"),
                P.atom("type", ["blind", "micro", "through-hole"]),
                P.item("at", At),
                P.pair("size", T.number),
                P.pair("drill", T.number),
                P.list("layers", T.string),
                P.pair("net", T.number),
                P.atom("locked"),
                P.atom("free"),
                P.atom("remove_unused_layers"),
                P.atom("keep_end_layers"),
                P.pair("tstamp", T.string),
            ),
        );
    }
}

export class Zone {
    locked = false;
    net: number;
    net_name: string;
    name: string;
    layer: string;
    layers: string[];
    hatch: { style: "none" | "edge" | "full"; pitch: number };
    priority: number;
    connect_pads: {
        type?: "yes" | "thru_hole_only" | "full" | "no";
        clearance: number;
    };
    min_thickness: number;
    filled_areas_thickness: boolean;
    keepout: ZoneKeepout;
    fill: ZoneFill;
    polygons: Poly[];
    filled_polygons: FilledPolygon[];
    tstamp: string;

    constructor(
        expr: Parseable,
        public parent?: KicadPCB | Footprint,
    ) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("zone"),
                P.atom("locked"),
                P.pair("net", T.number),
                P.pair("net_name", T.string),
                P.pair("net_name", T.string),
                P.pair("name", T.string),
                P.pair("layer", T.string),
                P.list("layers", T.string),
                P.object(
                    "hatch",
                    {},
                    P.positional("style", T.string),
                    P.positional("pitch", T.number),
                ),
                P.pair("priority", T.number),
                P.object(
                    "connect_pads",
                    {},
                    P.positional("type", T.string),
                    P.pair("clearance", T.number),
                ),
                P.pair("min_thickness", T.number),
                P.pair("filled_areas_thickness", T.boolean),
                P.item("keepout", ZoneKeepout),
                P.item("fill", ZoneFill),
                P.collection("polygons", "polygon", T.item(Poly)),
                P.collection(
                    "filled_polygons",
                    "filled_polygon",
                    T.item(FilledPolygon),
                ),
                P.pair("tstamp", T.string),
            ),
        );
    }
}

export class ZoneKeepout {
    tracks: "allowed" | "not_allowed";
    vias: "allowed" | "not_allowed";
    pads: "allowed" | "not_allowed";
    copperpour: "allowed" | "not_allowed";
    footprints: "allowed" | "not_allowed";

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("keepout"),
                P.pair("tracks", T.string),
                P.pair("vias", T.string),
                P.pair("pads", T.string),
                P.pair("copperpour", T.string),
                P.pair("footprints", T.string),
            ),
        );
    }
}

export class ZoneFill {
    fill = false;
    mode: "solid" | "hatch" = "solid";
    thermal_gap: number;
    thermal_bridge_width: number;
    smoothing: {
        style: "none" | "chamfer" | "fillet";
        radius: number;
    };
    radius: number;
    island_removal_mode: 0 | 1 | 2;
    island_area_min: number;
    hatch_thickness: number;
    hatch_gap: number;
    hatch_orientation: number;
    hatch_smoothing_level: 0 | 1 | 2 | 3;
    hatch_smoothing_value: number;
    hatch_border_algorithm: "hatch_thickness" | "min_thickness";
    hatch_min_hole_area: number;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("fill"),
                P.positional("fill", T.boolean),
                P.pair("mode", T.string),
                P.pair("thermal_gap", T.number),
                P.pair("thermal_bridge_width", T.number),
                P.expr(
                    "smoothing",
                    T.object(
                        {},
                        P.positional("style", T.string),
                        P.pair("radius", T.number),
                    ),
                ),
                P.pair("radius", T.number),
                P.pair("island_removal_mode", T.number),
                P.pair("island_area_min", T.number),
                P.pair("hatch_thickness", T.number),
                P.pair("hatch_gap", T.number),
                P.pair("hatch_orientation", T.number),
                P.pair("hatch_smoothing_level", T.number),
                P.pair("hatch_smoothing_value", T.number),
                P.pair("hatch_border_algorithm", T.string),
                P.pair("hatch_min_hole_area", T.number),
            ),
        );
    }
}

export class Layer {
    ordinal: number;
    canonical_name: string;
    type: "jumper" | "mixed" | "power" | "signal" | "user";
    user_name?: string;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.positional("ordinal", T.number),
                P.positional("canonical_name", T.string),
                P.positional("type", T.string),
                P.positional("user_name", T.string),
            ),
        );
    }
}

export class Setup {
    // stackup: Stackup;
    pad_to_mask_clearance: number;
    solder_mask_min_width: number;
    pad_to_paste_clearance: number;
    pad_to_paste_clearance_ratio: number;
    aux_axis_origin: Vec2;
    grid_origin: Vec2;
    pcbplotparams: PCBPlotParams;
    stackup: Stackup;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("setup"),
                P.pair("pad_to_mask_clearance", T.number),
                P.pair("solder_mask_min_width", T.number),
                P.pair("pad_to_paste_clearance", T.number),
                P.pair("pad_to_paste_clearance_ratio", T.number),
                P.vec2("aux_axis_origin"),
                P.vec2("grid_origin"),
                P.item("pcbplotparams", PCBPlotParams),
                P.item("stackup", Stackup),
            ),
        );
    }
}

export class PCBPlotParams {
    layerselection: number;
    disableapertmacros = false;
    usegerberextensions = false;
    usegerberattributes = false;
    usegerberadvancedattributes = false;
    creategerberjobfile = false;
    gerberprecision: number;
    svguseinch = false;
    svgprecision: number;
    excludeedgelayer = false;
    plotframeref = false;
    viasonmask = false;
    mode: number;
    useauxorigin = false;
    hpglpennumber: number;
    hpglpenspeed: number;
    hpglpendiameter: number;
    dxfpolygonmode = false;
    dxfimperialunits = false;
    dxfusepcbnewfont = false;
    psnegative = false;
    psa4output = false;
    plotreference = false;
    plotvalue = false;
    plotinvisibletext = false;
    sketchpadsonfab = false;
    subtractmaskfromsilk = false;
    outputformat: number;
    mirror = false;
    drillshape: number;
    scaleselection: number;
    outputdirectory: string;
    plot_on_all_layers_selection: number;
    dashed_line_dash_ratio: number;
    dashed_line_gap_ratio: number;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("pcbplotparams"),
                P.pair("layerselection", T.number),
                P.pair("disableapertmacros", T.boolean),
                P.pair("usegerberextensions", T.boolean),
                P.pair("usegerberattributes", T.boolean),
                P.pair("usegerberadvancedattributes", T.boolean),
                P.pair("creategerberjobfile", T.boolean),
                P.pair("gerberprecision", T.number),
                P.pair("svguseinch", T.boolean),
                P.pair("svgprecision", T.number),
                P.pair("excludeedgelayer", T.boolean),
                P.pair("plotframeref", T.boolean),
                P.pair("viasonmask", T.boolean),
                P.pair("mode", T.number),
                P.pair("useauxorigin", T.boolean),
                P.pair("hpglpennumber", T.number),
                P.pair("hpglpenspeed", T.number),
                P.pair("hpglpendiameter", T.number),
                P.pair("dxfpolygonmode", T.boolean),
                P.pair("dxfimperialunits", T.boolean),
                P.pair("dxfusepcbnewfont", T.boolean),
                P.pair("psnegative", T.boolean),
                P.pair("psa4output", T.boolean),
                P.pair("plotreference", T.boolean),
                P.pair("plotvalue", T.boolean),
                P.pair("plotinvisibletext", T.boolean),
                P.pair("sketchpadsonfab", T.boolean),
                P.pair("subtractmaskfromsilk", T.boolean),
                P.pair("outputformat", T.number),
                P.pair("mirror", T.boolean),
                P.pair("drillshape", T.number),
                P.pair("scaleselection", T.number),
                P.pair("outputdirectory", T.string),
                P.pair("plot_on_all_layers_selection", T.number),
                P.pair("dashed_line_dash_ratio", T.number),
                P.pair("dashed_line_gap_ratio", T.number),
            ),
        );
    }
}

export class Stackup {
    layers: StackupLayer[];
    copper_finish: string;
    dielectric_constraints = false;
    edge_connector: string;
    castellated_pads = false;
    edge_plating = false;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("stackup"),
                P.pair("copper_finish", T.string),
                P.pair("dielectric_constraints", T.boolean),
                P.pair("edge_connector", T.string),
                P.pair("castellated_pads", T.boolean),
                P.pair("edge_plating", T.boolean),
                P.collection("layers", "layer", T.item(StackupLayer)),
            ),
        );
    }
}

export class StackupLayer {
    name: string;
    type: string;
    color: string;
    thickness: number;
    material: string;
    epsilon_r: number;
    loss_tangent: number;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("layer"),
                P.positional("name", T.string),
                P.pair("type", T.string),
                P.pair("color", T.string),
                P.pair("thickness", T.number),
                P.pair("material", T.string),
                P.pair("epsilon_r", T.number),
                P.pair("loss_tangent", T.number),
            ),
        );
    }
}

export class Net {
    number: number;
    name: string;

    constructor(expr: Parseable) {
        // (net 2 "+3V3")
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("net"),
                P.positional("number", T.number),
                P.positional("name", T.string),
            ),
        );
    }
}

export class Dimension {
    locked = false;
    type: "aligned" | "leader" | "center" | "orthogonal" | "radial";
    layer: string;
    tstamp: string;
    pts: Vec2[];
    height: number;
    orientation: number;
    leader_length: number;
    gr_text: GrText;
    format: DimensionFormat;
    style: DimensionStyle;

    constructor(
        expr: Parseable,
        public parent: KicadPCB,
    ) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("dimension"),
                P.atom("locked"),
                P.pair("type", T.string),
                P.pair("layer", T.string),
                P.pair("tstamp", T.string),
                P.list("pts", T.vec2),
                P.pair("height", T.number),
                P.pair("orientation", T.number),
                P.pair("leader_length", T.number),
                P.item("gr_text", GrText, this),
                P.item("format", DimensionFormat),
                P.item("style", DimensionStyle),
            ),
        );
    }

    resolve_text_var(name: string): string | undefined {
        return this.parent.resolve_text_var(name);
    }

    get start(): Vec2 {
        return this.pts.at(0) ?? new Vec2(0, 0);
    }

    get end(): Vec2 {
        return this.pts.at(-1) ?? new Vec2(0, 0);
    }
}

export enum DimensionFormatUnits {
    inches,
    mils,
    millimeters,
    automatic,
}

export enum DimensionFormatUnitsFormat {
    none,
    bare,
    parenthesis,
}

export class DimensionFormat {
    prefix: string;
    suffix: string;
    units: DimensionFormatUnits;
    units_format: DimensionFormatUnitsFormat;
    precision: number;
    override_value: string;
    suppress_zeroes = false;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("format"),
                P.pair("prefix", T.string),
                P.pair("suffix", T.string),
                P.pair("units", T.number),
                P.pair("units_format", T.number),
                P.pair("precision", T.number),
                P.pair("override_value", T.string),
                P.atom("suppress_zeroes"),
            ),
        );
    }
}

export enum DimensionStyleTextPositionMode {
    outside,
    inline,
    manual,
}

export enum DimensionStyleTextFrame {
    none,
    rect,
    circle,
    roundrect,
}

export class DimensionStyle {
    thickness: number;
    arrow_length: number;
    text_position_mode: DimensionStyleTextPositionMode;
    extension_height: number;
    text_frame: DimensionStyleTextFrame;
    extension_offset: number;
    keep_text_aligned: boolean;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("style"),
                P.pair("thickness", T.number),
                P.pair("arrow_length", T.number),
                P.pair("text_position_mode", T.number),
                P.pair("extension_height", T.number),
                P.pair("text_frame", T.number),
                P.pair("extension_offset", T.number),
                P.atom("keep_text_aligned"),
            ),
        );
    }
}

type FootprintDrawings = FpLine | FpCircle | FpArc | FpPoly | FpRect | FpText;

export class Footprint {
    at: At;
    reference: string;
    value: string;
    library_link: string;
    version: number;
    generator: string;
    locked = false;
    placed = false;
    layer: string;
    tedit: string;
    tstamp: string;
    descr: string;
    tags: string;
    path: string;
    autoplace_cost90: number;
    autoplace_cost180: number;
    solder_mask_margin: number;
    solder_paste_margin: number;
    solder_paste_ratio: number;
    clearance: number;
    zone_connect: number;
    thermal_width: number;
    thermal_gap: number;
    attr: {
        through_hole: boolean;
        smd: boolean;
        virtual: boolean;
        board_only: boolean;
        exclude_from_pos_files: boolean;
        exclude_from_bom: boolean;
        allow_solder_mask_bridges: boolean;
        allow_missing_courtyard: boolean;
    } = {
        through_hole: false,
        smd: false,
        virtual: false,
        board_only: false,
        exclude_from_pos_files: false,
        exclude_from_bom: false,
        allow_solder_mask_bridges: false,
        allow_missing_courtyard: false,
    };
    properties: Record<string, string> = {};
    drawings: FootprintDrawings[] = [];
    pads: Pad[] = [];
    #pads_by_number = new Map<string, Pad>();
    zones: Zone[] = [];
    models: Model[] = [];
    #bbox: BBox;

    constructor(
        expr: Parseable,
        public parent: KicadPCB,
    ) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("footprint"),
                P.positional("library_link", T.string),
                P.pair("version", T.number),
                P.pair("generator", T.string),
                P.atom("locked"),
                P.atom("placed"),
                P.pair("layer", T.string),
                P.pair("tedit", T.string),
                P.pair("tstamp", T.string),
                P.item("at", At),
                P.pair("descr", T.string),
                P.pair("tags", T.string),
                P.pair("path", T.string),
                P.pair("autoplace_cost90", T.number),
                P.pair("autoplace_cost180", T.number),
                P.pair("solder_mask_margin", T.number),
                P.pair("solder_paste_margin", T.number),
                P.pair("solder_paste_ratio", T.number),
                P.pair("clearance", T.number),
                P.pair("zone_connect", T.number),
                P.pair("thermal_width", T.number),
                P.pair("thermal_gap", T.number),
                P.object(
                    "attr",
                    this.attr,
                    P.atom("through_hole"),
                    P.atom("smd"),
                    P.atom("virtual"),
                    P.atom("board_only"),
                    P.atom("exclude_from_pos_files"),
                    P.atom("exclude_from_bom"),
                    P.atom("allow_solder_mask_bridges"),
                    P.atom("allow_missing_courtyard"),
                ),
                P.dict("properties", "property", T.string),
                P.collection("drawings", "fp_line", T.item(FpLine, this)),
                P.collection("drawings", "fp_circle", T.item(FpCircle, this)),
                P.collection("drawings", "fp_arc", T.item(FpArc, this)),
                P.collection("drawings", "fp_poly", T.item(FpPoly, this)),
                P.collection("drawings", "fp_rect", T.item(FpRect, this)),
                P.collection("drawings", "fp_text", T.item(FpText, this)),
                P.collection("zones", "zone", T.item(Zone, this)),
                P.collection("models", "model", T.item(Model)),
                P.collection("pads", "pad", T.item(Pad, this)),
            ),
        );

        for (const pad of this.pads) {
            this.#pads_by_number.set(pad.number, pad);
        }

        for (const d of this.drawings) {
            if (!(d instanceof FpText)) {
                continue;
            }

            if (d.type == "reference") {
                this.reference = d.text;
            }
            if (d.type == "value") {
                this.value = d.text;
            }
        }
    }

    get uuid() {
        return this.tstamp;
    }

    *items(): Generator<FootprintDrawings | Pad | Zone, void, undefined> {
        yield* this.drawings ?? [];
        yield* this.zones ?? [];
        yield* this.pads.values() ?? [];
    }

    resolve_text_var(name: string): string | undefined {
        switch (name) {
            case "REFERENCE":
                return this.reference;
            case "VALUE":
                return this.value;
            case "LAYER":
                return this.layer;
            case "FOOTPRINT_LIBRARY":
                return this.library_link.split(":").at(0);
            case "FOOTPRINT_NAME":
                return this.library_link.split(":").at(-1);
        }

        const pad_expr = /^(NET_NAME|NET_CLASS|PIN_NAME)\(.+?\)$/.exec(name);

        if (pad_expr?.length == 3) {
            const [_, expr_type, pad_name] = pad_expr as unknown as [
                string,
                string,
                string,
            ];
            switch (expr_type) {
                case "NET_NAME":
                    return this.pad_by_number(pad_name)?.net.number.toString();
                case "NET_CLASS":
                    return this.pad_by_number(pad_name)?.net.name;
                case "PIN_NAME":
                    return this.pad_by_number(pad_name)?.pinfunction;
            }
        }

        if (this.properties[name] !== undefined) {
            return this.properties[name]!;
        }

        return this.parent.resolve_text_var(name);
    }

    pad_by_number(number: string): Pad {
        return this.#pads_by_number.get(number)!;
    }

    /**
     * Get the nominal bounding box for this footprint.
     *
     * This does not take into account text drawings.
     */
    get bbox() {
        if (!this.#bbox) {
            // Based on FOOTPRINT::GetBoundingBox, excludes text items.

            // start with a small bbox centered on the footprint's position,
            // so that even if there aren't any items there's still *some*
            // footprint.
            let bbox = new BBox(
                this.at.position.x - 0.25,
                this.at.position.y - 0.25,
                0.5,
                0.5,
            );

            const matrix = Matrix3.translation(
                this.at.position.x,
                this.at.position.y,
            ).rotate_self(Angle.deg_to_rad(this.at.rotation));

            for (const item of this.drawings) {
                if (item instanceof FpText) {
                    continue;
                }

                bbox = BBox.combine([bbox, item.bbox.transform(matrix)]);
            }

            bbox.context = this;
            this.#bbox = bbox;
        }
        return this.#bbox;
    }
}

class GraphicItem {
    parent?: Footprint;
    layer: string;
    tstamp: string;
    locked = false;

    /**
     * Get the nominal bounding box for the item. This does not include any
     * stroke or other expansion.
     */
    get bbox() {
        return new BBox(0, 0, 0, 0);
    }
}

export class Line extends GraphicItem {
    static expr_start = "unset";

    start: Vec2;
    end: Vec2;
    width: number;
    stroke: Stroke;

    constructor(
        expr: Parseable,
        public override parent?: Footprint,
    ) {
        super();

        const static_this = this.constructor as typeof Line;

        Object.assign(
            this,
            parse_expr(
                expr,
                P.start(static_this.expr_start),
                P.atom("locked"),
                P.pair("layer", T.string),
                P.vec2("start"),
                P.vec2("end"),
                P.pair("width", T.number),
                P.pair("tstamp", T.string),
                P.item("stroke", Stroke),
            ),
        );

        this.width ??= this.stroke?.width || 0;
    }

    override get bbox() {
        return BBox.from_points([this.start, this.end]);
    }
}

export class GrLine extends Line {
    static override expr_start = "gr_line";
}

export class FpLine extends Line {
    static override expr_start = "fp_line";
}

export class Circle extends GraphicItem {
    static expr_start = "unset";
    center: Vec2;
    end: Vec2;
    width: number;
    fill: string;
    stroke: Stroke;

    constructor(
        expr: Parseable,
        public override parent?: Footprint,
    ) {
        super();

        const static_this = this.constructor as typeof Circle;

        Object.assign(
            this,
            parse_expr(
                expr,
                P.start(static_this.expr_start),
                P.atom("locked"),
                P.vec2("center"),
                P.vec2("end"),
                P.pair("width", T.number),
                P.pair("fill", T.string),
                P.pair("layer", T.string),
                P.pair("tstamp", T.string),
                P.item("stroke", Stroke),
            ),
        );

        this.width ??= this.stroke?.width || 0;
    }

    override get bbox() {
        const radius = this.center.sub(this.end).magnitude;
        const radial = new Vec2(radius, radius);
        return BBox.from_points([
            this.center.sub(radial),
            this.center.add(radial),
        ]);
    }
}

export class GrCircle extends Circle {
    static override expr_start = "gr_circle";
}

export class FpCircle extends Circle {
    static override expr_start = "fp_circle";
}

export class Arc extends GraphicItem {
    static expr_start = "unset";
    start: Vec2;
    mid: Vec2;
    end: Vec2;
    width: number;
    stroke: Stroke;
    #arc: MathArc;

    constructor(
        expr: Parseable,
        public override parent?: Footprint,
    ) {
        super();

        const static_this = this.constructor as typeof Arc;

        const parsed = parse_expr(
            expr,
            P.start(static_this.expr_start),
            P.atom("locked"),
            P.pair("layer", T.string),
            P.vec2("start"),
            P.vec2("mid"),
            P.vec2("end"),
            P.pair("angle", T.number),
            P.pair("width", T.number),
            P.pair("tstamp", T.string),
            P.item("stroke", Stroke),
        );

        // Handle old format.
        // See LEGACY_ARC_FORMATTING and EDA_SHAPE::SetArcAngleAndEnd
        if (parsed["angle"] !== undefined) {
            const angle = Angle.from_degrees(parsed["angle"]).normalize720();
            const center = parsed["start"];
            let start = parsed["end"];

            let end = angle.negative().rotate_point(start, center);

            if (angle.degrees < 0) {
                [start, end] = [end, start];
            }

            this.#arc = MathArc.from_center_start_end(
                center,
                start,
                end,
                parsed["width"],
            );

            parsed["start"] = this.#arc.start_point;
            parsed["mid"] = this.#arc.mid_point;
            parsed["end"] = this.#arc.end_point;

            delete parsed["angle"];
        } else {
            this.#arc = MathArc.from_three_points(
                parsed["start"],
                parsed["mid"],
                parsed["end"],
                parsed["width"],
            );
        }

        Object.assign(this, parsed);

        this.width ??= this.stroke?.width ?? this.#arc.width;
        this.#arc.width = this.width;
    }

    get arc() {
        return this.#arc;
    }

    override get bbox() {
        return this.arc.bbox;
    }
}

export class GrArc extends Arc {
    static override expr_start = "gr_arc";
}

export class FpArc extends Arc {
    static override expr_start = "fp_arc";
}

export class Poly extends GraphicItem {
    static expr_start = "polygon";

    pts: Vec2[];
    width: number;
    fill: string;
    island: boolean;
    stroke: Stroke;

    constructor(
        expr: Parseable,
        public override parent?: Footprint,
    ) {
        super();

        const static_this = this.constructor as typeof Poly;

        Object.assign(
            this,
            parse_expr(
                expr,
                P.start(static_this.expr_start),
                P.atom("locked"),
                P.pair("layer", T.string),
                P.atom("island"),
                P.list("pts", T.vec2),
                P.pair("width", T.number),
                P.pair("fill", T.string),
                P.pair("tstamp", T.string),
                P.item("stroke", Stroke),
            ),
        );

        this.width ??= this.stroke?.width || 0;
    }

    override get bbox(): BBox {
        return BBox.from_points(this.pts);
    }
}

export class FilledPolygon extends Poly {
    static override expr_start = "filled_polygon";
}

export class GrPoly extends Poly {
    static override expr_start = "gr_poly";
}

export class FpPoly extends Poly {
    static override expr_start = "fp_poly";
}

export class Rect extends GraphicItem {
    static expr_start = "rect";

    start: Vec2;
    end: Vec2;
    width: number;
    fill: string;
    stroke: Stroke;

    constructor(
        expr: Parseable,
        public override parent?: Footprint,
    ) {
        super();

        const static_this = this.constructor as typeof Rect;

        Object.assign(
            this,
            parse_expr(
                expr,
                P.start(static_this.expr_start),
                P.atom("locked"),
                P.vec2("start"),
                P.vec2("end"),
                P.pair("layer", T.string),
                P.pair("width", T.number),
                P.pair("fill", T.string),
                P.pair("tstamp", T.string),
                P.item("stroke", Stroke),
            ),
        );

        this.width ??= this.stroke?.width || 0;
    }

    override get bbox(): BBox {
        return BBox.from_points([this.start, this.end]);
    }
}

export class GrRect extends Rect {
    static override expr_start = "gr_rect";
}

export class FpRect extends Rect {
    static override expr_start = "fp_rect";
}

export class TextRenderCache {
    text: string;
    angle: 0;
    polygons: Poly[];

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("render_cache"),
                P.positional("text", T.string),
                P.positional("angle", T.number),
                P.collection("polygons", "polygon", T.item(Poly)),
            ),
        );

        for (const poly of this.polygons) {
            poly.fill = "solid";
        }
    }
}

export class Text {
    parent?: Footprint | Dimension | KicadPCB;
    text: string;
    at: At;
    layer: { name: string; knockout: boolean };
    unlocked = false;
    hide = false;
    effects = new Effects();
    tstamp: string;
    render_cache: TextRenderCache;

    static common_expr_defs = [
        P.item("at", At),
        P.atom("hide"),
        P.atom("unlocked"),
        P.object(
            "layer",
            {},
            P.positional("name", T.string),
            P.atom("knockout"),
        ),
        P.pair("tstamp", T.string),
        P.item("effects", Effects),
        P.item("render_cache", TextRenderCache),
    ];

    get shown_text() {
        return expand_text_vars(this.text, this.parent);
    }
}

export class FpText extends Text {
    type: "reference" | "value" | "user";

    constructor(
        expr: Parseable,
        public override parent?: Footprint,
    ) {
        super();

        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("fp_text"),
                P.positional("type", T.string),
                P.positional("text", T.string),
                ...Text.common_expr_defs,
            ),
        );
    }
}

export class GrText extends Text {
    constructor(
        expr: Parseable,
        public override parent: Footprint | Dimension | KicadPCB,
    ) {
        super();

        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("gr_text"),
                P.positional("text", T.string),
                ...Text.common_expr_defs,
            ),
        );
    }
}

export class Pad {
    number: string; // I hate this
    type: "thru_hole" | "smd" | "connect" | "np_thru_hole" = "thru_hole";
    shape: "circle" | "rect" | "oval" | "trapezoid" | "roundrect" | "custom";
    locked = false;
    at: At;
    size: Vec2;
    rect_delta: Vec2;
    layers: string[];
    roundrect_rratio: number;
    chamfer_ratio: number;
    chamfer?: {
        top_left?: boolean;
        top_right?: boolean;
        bottom_right?: boolean;
        bottom_left?: boolean;
    };
    pinfunction: string;
    pintype: string;
    solder_mask_margin: number;
    solder_paste_margin: number;
    solder_paste_margin_ratio: number;
    clearance: number;
    thermal_width: number;
    thermal_gap: number;
    thermal_bridge_angle: number;
    zone_connect: number;
    drill: PadDrill;
    net: Net;
    options: PadOptions;
    primitives: (GrLine | GrCircle | GrArc | GrRect | GrPoly)[];

    constructor(
        expr: Parseable,
        public parent: Footprint,
    ) {
        const parsed = parse_expr(
            expr,
            P.start("pad"),
            P.positional("number", T.string),
            P.positional("type", T.string),
            P.positional("shape", T.string),
            P.item("at", At),
            P.atom("locked"),
            P.vec2("size"),
            P.vec2("rect_delta"),
            P.list("layers", T.string),
            P.pair("roundrect_rratio", T.number),
            P.pair("chamfer_ratio", T.number),
            P.expr(
                "chamfer",
                T.object(
                    {},
                    P.atom("top_right"),
                    P.atom("top_left"),
                    P.atom("bottom_right"),
                    P.atom("bottom_left"),
                ),
            ),
            P.pair("pinfunction", T.string),
            P.pair("pintype", T.string),
            P.pair("solder_mask_margin", T.number),
            P.pair("solder_paste_margin", T.number),
            P.pair("solder_paste_margin_ratio", T.number),
            P.pair("clearance", T.number),
            P.pair("thermal_width", T.number),
            P.pair("thermal_gap", T.number),
            P.pair("thermal_bridge_angle", T.number),
            P.pair("zone_connect", T.number),
            P.pair("tstamp", T.string),
            P.item("drill", PadDrill),
            P.item("net", Net),
            P.item("options", PadOptions),
            P.expr("primitives", (obj, name, expr) => {
                const parsed = parse_expr(
                    expr as List,
                    P.start("primitives"),
                    P.collection("items", "gr_line", T.item(GrLine, this)),
                    P.collection("items", "gr_circle", T.item(GrCircle, this)),
                    P.collection("items", "gr_arc", T.item(GrArc, this)),
                    P.collection("items", "gr_rect", T.item(GrRect, this)),
                    P.collection("items", "gr_poly", T.item(GrPoly, this)),
                );
                return (parsed as { items: any[] })?.["items"];
            }),
        );

        Object.assign(this, parsed);
    }
}

export class PadDrill {
    oval = false;
    diameter = 0;
    width = 0;
    offset: Vec2 = new Vec2(0, 0);

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("drill"),
                P.atom("oval"),
                P.positional("diameter", T.number),
                P.positional("width", T.number),
                P.vec2("offset"),
            ),
        );
    }
}

export class PadOptions {
    clearance: "outline" | "convexhull";
    anchor: "rect" | "circle";

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("options"),
                P.pair("clearance", T.string),
                P.pair("anchor", T.string),
            ),
        );
    }
}

export class Model {
    filename: string;
    offset: { xyz: number[] };
    scale: { xyz: number[] };
    rotate: { xyz: number[] };
    hide = false;
    opacity = 1;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("model"),
                P.positional("filename", T.string),
                P.atom("hide"),
                P.pair("opacity", T.number),
                P.object("offset", {}, P.list("xyz", T.number)),
                P.object("scale", {}, P.list("xyz", T.number)),
                P.object("rotate", {}, P.list("xyz", T.number)),
            ),
        );
    }
}

export class Group {
    name: string;
    id: string;
    locked = false;
    members: string[];

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("group"),
                P.positional("name", T.string),
                P.atom("locked"),
                P.pair("id", T.string),
                P.list("members", T.string),
            ),
        );
    }
}
