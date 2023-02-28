/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse_expr, P, T, type Parseable } from "./parser.ts";
import { Vec2 } from "../math/vec2.ts";
import { Color } from "../gfx/color.ts";
import default_sheet from "./default_drawing_sheet.kicad_wks";

export class DrawingSheet {
    version: number;
    generator: string;
    setup: Setup;
    items: DrawingSheetItem[] = [];

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("kicad_wks"),
                P.pair("version", T.number),
                P.pair("generator", T.string),
                P.item("setup", Setup),
                P.collection("items", "line", T.item(Line)),
                P.collection("items", "rect", T.item(Rect)),
                P.collection("items", "polygon", T.item(Polygon)),
                P.collection("items", "bitmap", T.item(Bitmap)),
                P.collection("items", "tbtext", T.item(TbText)),
            ),
        );
    }

    static default() {
        return new DrawingSheet(default_sheet);
    }
}

export class Setup {
    linewidth: number;
    textsize: Vec2;
    textlinewidth: number;
    top_margin: number;
    left_margin: number;
    bottom_margin: number;
    right_margin: number;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("setup"),
                P.pair("linewidth", T.number),
                P.vec2("textsize"),
                P.pair("textlinewidth", T.number),
                P.pair("top_margin", T.number),
                P.pair("left_margin", T.number),
                P.pair("bottom_margin", T.number),
                P.pair("right_margin", T.number),
            ),
        );
    }
}

export class Coordinate {
    position: Vec2 = new Vec2(0, 0);
    anchor: "ltcorner" | "lbcorner" | "rbcorner" | "rtcorner" = "rbcorner";

    constructor(expr: Parseable) {
        const parsed = parse_expr(
            expr,
            P.positional("start_token"),
            P.positional("x", T.number),
            P.positional("y", T.number),
            P.positional("anchor", T.string),
        );

        this.position.x = parsed["x"];
        this.position.y = parsed["y"];
        this.anchor = parsed["anchor"] ?? this.anchor;
    }
}

export class DrawingSheetItem {
    name: string;
    comment: string;
    option: "page1only" | "notonpage1" | null;
    repeat: number;
    incrx: number;
    incry: number;
    linewidth: number;

    static common_expr_defs = [
        P.pair("name", T.string),
        P.pair("comment", T.string),
        P.pair("option", T.string),
        P.pair("repeat", T.number),
        P.pair("incrx", T.number),
        P.pair("incry", T.number),
        P.pair("linewidth", T.number),
    ];
}

export class Line extends DrawingSheetItem {
    start: Coordinate;
    end: Coordinate;

    constructor(expr: Parseable) {
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("line"),
                P.item("start", Coordinate),
                P.item("end", Coordinate),
                ...DrawingSheetItem.common_expr_defs,
            ),
        );
    }
}

export class Rect extends DrawingSheetItem {
    start: Coordinate;
    end: Coordinate;

    constructor(expr: Parseable) {
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("rect"),
                P.item("start", Coordinate),
                P.item("end", Coordinate),
                ...DrawingSheetItem.common_expr_defs,
            ),
        );
    }
}

export class Polygon extends DrawingSheetItem {
    rotate: number;
    pos: Coordinate;
    pts: Vec2[];

    constructor(expr: Parseable) {
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("polygon"),
                P.item("pos", Coordinate),
                P.pair("rotate", T.number),
                P.list("pts", T.vec2),
                ...DrawingSheetItem.common_expr_defs,
            ),
        );
    }
}

export class Bitmap extends DrawingSheetItem {
    scale: number;
    pos: Coordinate;
    pngdata: string;

    constructor(expr: Parseable) {
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("bitmap"),
                P.item("pos", Coordinate),
                P.pair("scale", T.number),
                P.pair("pngdata", T.string),
                ...DrawingSheetItem.common_expr_defs,
            ),
        );
    }
}

export class TbText extends DrawingSheetItem {
    text: string;
    incrlabel: number;
    pos: Coordinate;
    maxlen: number;
    maxheight: number;
    font: Font;
    justify: "center" | "left" | "right" | "top" | "bottom";
    rotate: number;

    constructor(expr: Parseable) {
        super();
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("tbtext"),
                P.positional("text"),
                P.item("pos", Coordinate),
                P.pair("incrlabel", T.number),
                P.pair("maxlen", T.number),
                P.pair("maxheight", T.number),
                P.item("font", Font),
                P.pair("rotate", T.number),
                P.pair("justify", T.string),
                ...DrawingSheetItem.common_expr_defs,
            ),
        );
    }
}

export class Font {
    color: Color = Color.transparent_black;
    face: string;
    bold: boolean;
    italic: boolean;
    size: Vec2;
    linewidth: number;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("font"),
                P.pair("face", T.string),
                P.atom("bold"),
                P.atom("italic"),
                P.vec2("size"),
                P.pair("linewidth", T.number),
            ),
        );
    }
}
