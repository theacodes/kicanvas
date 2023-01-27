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

import { Color } from "../gfx/color";
import { Vec2 } from "../math/vec2";
import { Token, tokenize } from "./tokenizer";

type TokenType = symbol | symbol[];

export class Parser {
    tokens: Generator<Token>;
    token: Token;

    /**
     * Create a new Parser
     */
    constructor(tokens: string | Generator<Token>) {
        if (typeof tokens == "string") {
            this.tokens = tokenize(tokens);
        } else {
            this.tokens = tokens;
        }
        this.next();
    }

    next() {
        this.token = this.tokens.next().value;
    }

    accept(type: TokenType): Token | null {
        if (!Array.isArray(type)) {
            type = [type];
        }
        if (this.token === undefined || this.token === null) {
            console.log("End of tokens");
            return null;
        } else if (type.includes(this.token.type)) {
            const token = this.token;
            this.next();
            return token;
        } else {
            return null;
        }
    }

    expect(type: TokenType): Token {
        const token = this.accept(type);
        if (token === null) {
            throw new Error(`Unexpected token ${JSON.stringify(this.token)}`);
        }
        return token;
    }

    _parse(expect_open = true): SExprParser {
        const elements = [];

        if (expect_open) {
            this.expect(Token.OPEN);
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const element = this.accept([
                Token.ATOM,
                Token.STRING,
                Token.NUMBER,
                Token.OPEN,
            ]);

            if (element === null) {
                break;
            } else if (element.type === Token.OPEN) {
                elements.push(this._parse((expect_open = false)));
            } else {
                elements.push(element);
            }
        }

        this.expect(Token.CLOSE);

        return new SExprParser(elements);
    }

    parse(): SExprParser {
        const sexpr = this._parse();

        // A full document has one top-level s-expression.
        if (!this.token) {
            return sexpr;
        }

        // A document fragment has many top-level s-expressions, so keep parsing until it's done.
        const elements = [sexpr];

        while (this.token) {
            elements.push(this._parse());
        }

        return new SExprParser(elements);
    }
}

type ElementType = "list" | symbol;
type Element = Token | SExprParser;
type Unboxable = Token | SExprParser | string | number;
type Unboxed = string | number | SExprParser;
type Matchable = string | number;

export class SExprParser {
    /**
     * Create an SExprParser
     */
    constructor(public elements: Element[], public index: number = 0) {}

    get element(): Element {
        if (this.index > this.elements.length - 1) {
            return null;
        } else {
            return this.elements[this.index];
        }
    }

    next(): Element {
        this.index++;
        return this.element;
    }

    reset() {
        this.index = 0;
    }

    unbox(value: Unboxable): Unboxed {
        if (value instanceof Token) {
            if ([Token.ATOM, Token.STRING, Token.NUMBER].includes(value.type)) {
                return value.value;
            } else {
                throw new Error(
                    `Can not unbox token type ${String(value.type)}`
                );
            }
        } else if (value instanceof SExprParser) {
            return value;
        } else if (typeof value == "string") {
            return value;
        } else if (typeof value == "number") {
            return value;
        } else {
            throw new Error(`Can not unbox value ${JSON.stringify(value)}`);
        }
    }

    *rest() {
        while (this.element) {
            yield this.unbox(this.element);
            this.next();
        }
    }

    maybe(type: ElementType, match: Matchable = null): Unboxable {
        const e = this.element;

        if (e instanceof Token && e.type == type) {
            const value = this.unbox(e);

            if (match !== null) {
                if (value === match) {
                    this.next();
                    return value;
                } else {
                    return null;
                }
            } else {
                this.next();
                return value;
            }
        } else if (e instanceof SExprParser && type == "list") {
            this.next();
            return e;
        } else if (type === null) {
            this.next();
            return e;
        } else {
            return null;
        }
    }

    maybe_atom(match: string = null): string | null {
        return this.maybe(Token.ATOM, match) as string | null;
    }

    maybe_number(match: number = null): number | null {
        return this.maybe(Token.NUMBER, match) as number | null;
    }

    maybe_string(match: string = null): string | null {
        return this.maybe(Token.STRING, match) as string | null;
    }

    maybe_list(): SExprParser | null {
        const e = this.maybe("list");
        if (e instanceof SExprParser) {
            return e;
        } else {
            return null;
        }
    }

    expect(type: ElementType, match: Matchable = null): Unboxable {
        const val = this.maybe(type, match);

        if (val === null) {
            throw new Error(
                `Expected ${String(type)} found ${JSON.stringify(this.element)}`
            );
        }

        return val;
    }

    expect_atom(match: string = null): string {
        return this.expect(Token.ATOM, match) as string;
    }

    expect_number(match: number = null): number {
        return this.expect(Token.NUMBER, match) as number;
    }

    expect_string(match: string = null): string {
        return this.expect(Token.STRING, match) as string;
    }

    expect_list(): SExprParser {
        return this.expect("list") as SExprParser;
    }

    maybe_expr(name: string): SExprParser | null {
        const e = this.maybe_list();

        if (e === null) {
            return null;
        }

        const n = e.maybe_atom(name);

        if (n === null) {
            this.index--;
            e.reset();
            return null;
        }

        return e;
    }

    expect_expr(name: string) {
        const e = this.maybe_expr(name);
        if (e === null) {
            throw new Error(
                `Expected expression ${name}, have ${JSON.stringify(
                    this.element
                )}`
            );
        }
        return e;
    }

    *iter_exprs(name: string) {
        const start_index = this.index;

        for (const e of this.elements) {
            if (e instanceof SExprParser && e.maybe_atom(name)) {
                yield e;
                e.reset();
            }
        }

        this.index = start_index;
    }

    maybe_pair(name: string, type: ElementType): Unboxable | null {
        const e = this.maybe_list();

        if (e === null) {
            return null;
        }

        const n = e.maybe_atom(name);

        if (n === null) {
            this.index--;
            e.reset();
            return null;
        }

        const v = e.maybe(type);

        if (v === null) {
            this.index--;
            e.reset();
            return null;
        }

        return v;
    }

    maybe_pair_any(name: string): Unboxed | null {
        const val = this.maybe_pair(name, null);
        if (val) {
            return this.unbox(val);
        } else {
            return null;
        }
    }

    maybe_pair_atom(name: string): string | null {
        return this.maybe_pair(name, Token.ATOM) as string | null;
    }

    maybe_pair_string(name: string): string | null {
        return this.maybe_pair(name, Token.STRING) as string | null;
    }

    maybe_pair_number(name: string): number | null {
        return this.maybe_pair(name, Token.NUMBER) as number | null;
    }

    maybe_pair_list(name: string): SExprParser | null {
        return this.maybe_pair(name, "list") as SExprParser | null;
    }

    expect_pair(name: string, type: ElementType): Unboxable {
        const v = this.maybe_pair(name, type);
        if (v === null) {
            throw new Error(
                `Expected pair ${name}, found ${JSON.stringify(this.element)}`
            );
        }
        return v;
    }

    expect_pair_atom(name: string): string {
        return this.expect_pair(name, Token.ATOM) as string;
    }

    expect_pair_string(name: string): string {
        return this.expect_pair(name, Token.STRING) as string;
    }

    expect_pair_any(name: string): Unboxable {
        return this.expect_pair(name, null) as Unboxable;
    }

    expect_pair_number(name: string): number {
        return this.expect_pair(name, Token.NUMBER) as number;
    }

    expect_pair_list(name: string): SExprParser {
        return this.expect_pair(name, "list") as SExprParser;
    }

    maybe_vec2(name: string, default_value: Vec2 = new Vec2(0, 0)): Vec2 {
        const v = this.maybe_expr(name);
        if (!v) {
            return default_value;
        }
        return new Vec2(v.expect_number(), v.expect_number());
    }

    expect_vec2(name: string): Vec2 {
        const v = this.expect_expr(name);
        return new Vec2(v.expect_number(), v.expect_number());
    }

    expect_vec2_list(name = "pts", point_name = "xy"): Vec2[] {
        const pts = [];
        const e = this.expect_expr(name);
        let c;
        while ((c = e.maybe_expr(point_name)) !== null) {
            pts.push(new Vec2(c.expect_number(), c.expect_number()));
        }
        return pts;
    }

    maybe_color(name = "color") {
        const e = this.maybe_expr(name);
        if (!e) {
            return Color.transparent;
        }
        return new Color(
            e.expect_number(),
            e.expect_number(),
            e.expect_number(),
            e.expect_number()
        );
    }

    expect_color(name = "color") {
        const e = this.expect_expr(name);
        return new Color(
            e.expect_number(),
            e.expect_number(),
            e.expect_number(),
            e.expect_number()
        );
    }
}

export function parse(src: string): SExprParser {
    return new Parser(src).parse();
}
