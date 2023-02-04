/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/*
    References:
    - https://dev-docs.kicad.org/en/file-formats/sexpr-intro/
    - https://gitlab.com/edea-dev/edea/-/tree/main/edea
*/

import { Vec2 } from "../math/vec2";
import { SExprParser } from "./parser-old";

export class At {
    position: Vec2;
    rotation: number;
    unlocked: boolean;

    constructor(e: SExprParser) {
        this.position = new Vec2(e.expect_number(), e.expect_number());
        this.rotation = e.maybe_number() ?? 0;
        this.unlocked = e.maybe_atom("unlocked") ? true : false;
    }
}
export class Paper {
    size: string;
    width: number;
    height: number;
    portrait: boolean;

    constructor(e: SExprParser) {
        this.size = e.maybe_string();
        this.width = e.maybe_number();
        this.height = e.maybe_number();
        this.portrait = e.maybe_atom("portrait") !== null;
    }
}

export class TitleBlock {
    title = "";
    date = "";
    rev = "";
    company = "";
    comment_1 = "";
    comment_2 = "";
    comment_3 = "";
    comment_4 = "";
    comment_5 = "";
    comment_6 = "";
    comment_7 = "";
    comment_8 = "";
    comment_9 = "";

    constructor(e: SExprParser) {
        if (e == null) {
            return;
        }

        const maybe_comment = (): string => {
            const ce = e.maybe_expr("comment");
            if (ce === null) {
                return null;
            }
            return ce.unbox(ce.elements[2]) as string;
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

export class Effects {
    size: Vec2;
    thickness: number;
    bold: boolean;
    italic: boolean;
    h_align: "left" | "center" | "right";
    v_align: "top" | "center" | "bottom";
    mirror: boolean;
    hide: boolean;

    constructor(e: SExprParser = null) {
        this.size = new Vec2(1.27, 1.27);
        this.bold = false;
        this.italic = false;
        this.h_align = "center";
        this.v_align = "center";
        this.mirror = false;
        this.hide = false;

        if (e) {
            this.from_expr(e);
        }
    }

    from_expr(e: SExprParser) {
        const font = e.expect_expr("font");
        const font_size = font.expect_expr("size");
        this.size = new Vec2(
            font_size.expect_number(),
            font_size.expect_number(),
        );
        this.thickness = font.maybe_pair_number("thickness");
        this.bold = font.maybe_atom("bold") ? true : false;
        this.italic = font.maybe_atom("italic") ? true : false;

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

    copy() {
        const e = new Effects();
        e.size = this.size.copy();
        e.thickness = this.thickness;
        e.bold = this.bold;
        e.italic = this.italic;
        e.h_align = this.h_align;
        e.v_align = this.v_align;
        e.mirror = this.mirror;
        e.hide = this.hide;
        return e;
    }
}
