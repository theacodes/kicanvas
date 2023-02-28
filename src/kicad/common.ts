/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse_expr, P, T, type Parseable } from "./parser.ts";
import { Vec2 } from "../math/vec2.ts";
import { Color } from "../gfx/color.ts";

export function expand_text_vars(
    text: string,
    vars?: Map<string, string | undefined>,
): string {
    if (!vars) {
        return text;
    }

    for (const [k, v] of vars.entries()) {
        text = text.replaceAll("${" + k + "}", v ?? "");
        text = text.replaceAll("${" + k.toUpperCase() + "}", v ?? "");
    }

    const escape_vars = {
        slash: "/",
        backslash: "\\",
        lt: "<",
        gt: ">",
        colon: ":",
        dblquote: '"',
        bar: "|",
        tab: "\t",
        return: "\n",
    };

    for (const [k, v] of Object.entries(escape_vars)) {
        text = text.replaceAll("{" + k + "}", v);
    }

    return text;
}

export class At {
    position = new Vec2(0, 0);
    rotation = 0;
    unlocked = false;

    constructor(expr?: Parseable) {
        if (expr) {
            const parsed = parse_expr(
                expr,
                P.start("at"),
                P.positional("x", T.number),
                P.positional("y", T.number),
                P.positional("rotation", T.number),
                P.atom("unlocked"),
            ) as {
                x: number;
                y: number;
                rotation?: number;
                unlocked?: boolean;
            };
            this.position.set(parsed.x, parsed.y);
            this.rotation = parsed.rotation ?? this.rotation;
            this.unlocked = parsed.unlocked ?? this.unlocked;
        }
    }
}

export const PaperSize = {
    User: [431.8, 279.4] as const,
    A0: [1189, 841] as const,
    A1: [841, 594] as const,
    A2: [594, 420] as const,
    A3: [420, 297] as const,
    A4: [297, 210] as const,
    A5: [210, 148] as const,
    A: [279.4, 215.9] as const,
    B: [431.8, 279.4] as const,
    C: [558.8, 431.8] as const,
    D: [863.6, 558.8] as const,
    E: [1117.6, 863.6] as const,
    USLetter: [279.4, 215.9] as const,
    USLegal: [355.6, 215.9] as const,
    USLedger: [431.8, 279.4] as const,
};

export type PaperSizeName = keyof typeof PaperSize;

export class Paper {
    size: PaperSizeName;
    width?: number;
    height?: number;
    portrait = false;

    constructor(expr: Parseable) {
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("paper"),
                P.atom("size", Object.keys(PaperSize)),
                P.positional("width", T.number),
                P.positional("height", T.number),
                P.atom("portrait"),
            ),
        );

        const paper_size = PaperSize[this.size];

        if (!this.width && paper_size) {
            this.width = paper_size[0];
        }

        if (!this.height && paper_size) {
            this.height = paper_size[1];
        }
    }
}

export class TitleBlock {
    title = "";
    date = "";
    rev = "";
    company = "";
    comment: Record<string, string> = {};

    constructor(expr: Parseable) {
        /*
        (title_block
            (title "Starfish")
            (date "2022-12-18")
            (rev "v2")
            (company "Winterbloom")
            (comment 1 "Alethea Flowers")
            (comment 2 "CERN-OHL-S V2")
            (comment 3 "starfish.wntr.dev")
        )
        */
        Object.assign(
            this,
            parse_expr(
                expr,
                P.start("title_block"),
                P.pair("title", T.string),
                P.pair("date", T.string),
                P.pair("rev", T.string),
                P.pair("company", T.string),
                P.expr("comment", (obj, name, e) => {
                    const ep = e as [string, string, string];
                    const record: Record<string, any> = obj[name] ?? {};
                    record[ep[1]] = ep[2];
                    return record;
                }),
            ),
        );
    }

    get text_vars(): Map<string, string | undefined> {
        return new Map([
            ["ISSUE_DATE", this.date],
            ["REVISION", this.rev],
            ["TITLE", this.title],
            ["COMPANY", this.company],
            ["COMMENT1", this.comment[1]],
            ["COMMENT2", this.comment[2]],
            ["COMMENT3", this.comment[3]],
            ["COMMENT4", this.comment[4]],
            ["COMMENT5", this.comment[5]],
            ["COMMENT6", this.comment[6]],
            ["COMMENT7", this.comment[7]],
            ["COMMENT8", this.comment[8]],
            ["COMMENT9", this.comment[9]],
        ]);
    }
}

export class Effects {
    font = new Font();
    justify = new Justify();
    hide = false;

    constructor(expr?: Parseable) {
        if (expr) {
            Object.assign(
                this,
                parse_expr(
                    expr,
                    P.start("effects"),
                    P.item("font", Font),
                    P.item("justify", Justify),
                    P.atom("hide"),
                    P.color(),
                ),
            );
        }
    }

    copy() {
        const e = new Effects();
        e.font = this.font.copy();
        e.justify = this.justify.copy();
        e.hide = this.hide;
        return e;
    }
}

export class Font {
    face?: string;
    size: Vec2 = new Vec2(1.27, 1.27);
    thickness = 0;
    bold = false;
    italic = false;
    color: Color = Color.transparent_black;

    constructor(expr?: Parseable) {
        if (expr) {
            Object.assign(
                this,
                parse_expr(
                    expr,
                    P.start("font"),
                    P.pair("face", T.string),
                    P.vec2("size"),
                    P.pair("thickness", T.number),
                    P.atom("bold"),
                    P.atom("italic"),
                    P.pair("line_spacing", T.number),
                ),
            );

            // Note: KiCAD saves height as the first number and width as the
            // second. I have no fucking idea why they did that.
            [this.size.x, this.size.y] = [this.size.y, this.size.x];
        }
    }

    copy() {
        const f = new Font();
        f.face = this.face;
        f.size = this.size.copy();
        f.thickness = this.thickness;
        f.bold = this.bold;
        f.italic = this.italic;
        return f;
    }
}

export class Justify {
    horizontal: "left" | "center" | "right" = "center";
    vertical: "top" | "center" | "bottom" = "center";
    mirror = false;

    constructor(expr?: Parseable) {
        if (expr) {
            Object.assign(
                this,
                parse_expr(
                    expr,
                    P.start("justify"),
                    P.atom("horizontal", ["left", "right"]),
                    P.atom("vertical", ["top", "bottom"]),
                    P.atom("mirror"),
                ),
            );
        }
    }

    copy() {
        const j = new Justify();
        j.horizontal = this.horizontal;
        j.vertical = this.vertical;
        j.mirror = this.mirror;
        return j;
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
