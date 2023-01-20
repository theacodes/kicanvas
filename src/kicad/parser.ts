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
import * as Tokenizer from "./tokenizer.js";

export class Parser {
    /** @type {Generator<Tokenizer.Token>} */
    tokens;

    /** @type {Tokenizer.Token} */
    token;

    /**
     * Create a new Parser
     * @param {string|Generator<Tokenizer.Token>} str_or_tokens
     */
    constructor(str_or_tokens) {
        if (typeof str_or_tokens === "string") {
            this.tokens = Tokenizer.tokenize(str_or_tokens);
        } else {
            this.tokens = str_or_tokens;
        }
        this.next();
    }

    next() {
        this.token = this.tokens.next().value;
    }

    /**
     * @param {Symbol | Symbol[]} type
     * @returns {Tokenizer.Token?}
     */
    accept(type) {
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

    /**
     * @param {Symbol | Symbol[]} type
     * @returns {Tokenizer.Token}
     */
    expect(type) {
        const token = this.accept(type);
        if (token === null) {
            throw new Error(`Unexpected token ${JSON.stringify(this.token)}`);
        }
        return token;
    }

    /**
     * @param {boolean} expect_open
     * @returns {SExprParser}
     */
    _parse(expect_open = true) {
        const elements = [];

        if (expect_open) {
            this.expect(Tokenizer.Token.OPEN);
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const element = this.accept([
                Tokenizer.Token.ATOM,
                Tokenizer.Token.STRING,
                Tokenizer.Token.NUMBER,
                Tokenizer.Token.OPEN,
            ]);

            if (element === null) {
                break;
            } else if (element.type === Tokenizer.Token.OPEN) {
                elements.push(this._parse((expect_open = false)));
            } else {
                elements.push(element);
            }
        }

        this.expect(Tokenizer.Token.CLOSE);

        return new SExprParser(elements);
    }

    /**
     * @returns {SExprParser}
     */
    parse() {
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

type Element = Tokenizer.Token | SExprParser;
type Unboxable = Tokenizer.Token | SExprParser | string | number;
type Unboxed = string | number | SExprParser;

export class SExprParser {
    /**
     * Create an SExprParser
     */
    constructor(public elements: Element[], public index: number = 0) {
    }

    get element() {
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
        if (value instanceof Tokenizer.Token) {
            if (
                [
                    Tokenizer.Token.ATOM,
                    Tokenizer.Token.STRING,
                    Tokenizer.Token.NUMBER,
                ].includes(value.type)
            ) {
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

    * rest() {
        while (this.element) {
            yield this.unbox(this.element);
            this.next();
        }
    }

    /**
     * @param {symbol|string?} type
     * @param {*} match
     * @returns {(Tokenizer.Token|SExprParser|number|string)?}
     */
    maybe(type, match = null) {
        const e = this.element;
        if (e instanceof Tokenizer.Token && e.type === type) {
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

    /**
     * @param {string?} match
     * @returns {string?}
     */
    maybe_atom(match = null) {
        return /** @type {string?} */ (this.maybe(Tokenizer.Token.ATOM, match));
    }

    /**
     * @param {number?} match
     * @returns {number?}
     */
    maybe_number(match = null) {
        return /** @type {number?} */ (
            this.maybe(Tokenizer.Token.NUMBER, match)
        );
    }

    /**
     * @param {string?} match
     * @returns {string?}
     */
    maybe_string(match = null) {
        return /** @type {string?} */ (
            this.maybe(Tokenizer.Token.STRING, match)
        );
    }

    /**
     * @returns {SExprParser?}
     */
    maybe_list() {
        const e = this.maybe("list");
        if (e instanceof SExprParser) {
            return e;
        } else {
            return null;
        }
    }

    /**
     * @param {symbol|string} type
     * @param {*} match
     * @returns {(Tokenizer.Token|SExprParser|number|string)}
     */
    expect(type, match = null) {
        const val = this.maybe(type, match);

        if (val === null) {
            throw new Error(
                `Expected ${String(type)} found ${JSON.stringify(this.element)}`
            );
        }

        return val;
    }

    /**
     * @param {string?} match
     * @returns {string}
     */
    expect_atom(match = null) {
        return /** @type {string} */ (this.expect(Tokenizer.Token.ATOM, match));
    }

    /**
     * @param {number?} match
     * @returns {number}
     */
    expect_number(match = null) {
        return /** @type {number} */ (
            this.expect(Tokenizer.Token.NUMBER, match)
        );
    }

    /**
     * @param {string?} match
     * @returns {string}
     */
    expect_string(match = null) {
        return /** @type {string} */ (
            this.expect(Tokenizer.Token.STRING, match)
        );
    }

    /**
     * @param {SExprParser?} match
     * @returns {SExprParser}
     */
    expect_list(match = null) {
        return /** @type {SExprParser} */ (this.expect("list", match));
    }

    /**
     * @param {string} name
     * @returns {SExprParser?}
     */
    maybe_expr(name) {
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

    /**
     * @param {string} name
     * @returns {SExprParser}
     */
    expect_expr(name) {
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

    /**
     * @param {string} name
     * @yields {SExprParser}
     */
    * iter_exprs(name) {
        const start_index = this.index;

        for (const e of this.elements) {
            if (e instanceof SExprParser && e.maybe_atom(name)) {
                yield e;
                e.reset();
            }
        }

        this.index = start_index;
    }

    /**
     * @param {string} name
     * @param {symbol|string?} type
     * @returns {(Tokenizer.Token|SExprParser|number|string)?}
     */
    maybe_pair(name, type) {
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

    /**
     * @param {string} name
     * @returns {(Tokenizer.Token|SExprParser|number|string)?}
     */
    maybe_pair_any(name) {
        const val = this.maybe_pair(name, null);
        if (val) {
            return this.unbox(val);
        } else {
            return null;
        }
    }

    /**
     * @param {string} name
     * @returns {string?}
     */
    maybe_pair_atom(name) {
        return /** @type {string?} */ (
            this.maybe_pair(name, Tokenizer.Token.ATOM)
        );
    }

    /**
     * @param {string} name
     * @returns {string?}
     */
    maybe_pair_string(name) {
        return /** @type {string?} */ (
            this.maybe_pair(name, Tokenizer.Token.STRING)
        );
    }

    /**
     * @param {string} name
     * @returns {number?}
     */
    maybe_pair_number(name) {
        return /** @type {number?} */ (
            this.maybe_pair(name, Tokenizer.Token.NUMBER)
        );
    }

    /**
     * @param {string} name
     * @returns {SExprParser?}
     */
    maybe_pair_list(name) {
        return /** @type {SExprParser?} */ (this.maybe_pair(name, "list"));
    }

    /**
     * @param {string} name
     * @param {string|symbol?} type
     * @returns {(Tokenizer.Token|SExprParser|number|string)}
     */
    expect_pair(name, type) {
        const v = this.maybe_pair(name, type);
        if (v === null) {
            throw new Error(
                `Expected pair ${name}, found ${JSON.stringify(this.element)}`
            );
        }
        return v;
    }

    /**
     * @param {string} name
     * @returns {string}
     */
    expect_pair_atom(name) {
        return /** @type {string} */ (
            this.expect_pair(name, Tokenizer.Token.ATOM)
        );
    }

    /**
     * @param {string} name
     * @returns {string}
     */
    expect_pair_string(name) {
        return /** @type {string} */ (
            this.expect_pair(name, Tokenizer.Token.STRING)
        );
    }

    /**
     * @param {string} name
     * @returns {number}
     */
    expect_pair_number(name) {
        return /** @type {number} */ (
            this.expect_pair(name, Tokenizer.Token.NUMBER)
        );
    }

    /**
     * @param {string} name
     * @returns {SExprParser}
     */
    expect_pair_list(name) {
        return /** @type {SExprParser} */ (this.expect_pair(name, "list"));
    }

    /**
     * @param {string} name
     * @param {Vec2} def
     * @returns {Vec2}
     */
    maybe_vec2(name, def = new Vec2(0, 0)) {
        const v = this.maybe_expr(name);
        if (!v) {
            return def;
        }
        return new Vec2(v.expect_number(), v.expect_number());
    }

    /**
     * @param {string} name
     * @returns {Vec2}
     */
    expect_vec2(name) {
        const v = this.expect_expr(name);
        return new Vec2(v.expect_number(), v.expect_number());
    }

    /**
     * @param {string} name
     * @param {string} point_name
     * @returns {Vec2[]}
     */
    expect_vec2_list(name = "pts", point_name = "xy") {
        const pts = [];
        const e = this.expect_expr(name);
        let c;
        while ((c = e.maybe_expr(point_name)) !== null) {
            pts.push(new Vec2(c.expect_number(), c.expect_number()));
        }
        return pts;
    }
}

/**
 * @param {string} str_or_tokens
 * @returns {SExprParser}
 */
export function parse(str_or_tokens) {
    return new Parser(str_or_tokens).parse();
}
