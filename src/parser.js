/*
    References:
    - https://dev-docs.kicad.org/en/file-formats/sexpr-intro/
    - https://gitlab.com/edea-dev/edea/-/tree/main/edea
*/

import * as Tokenizer from "./tokenizer.js";

export class Parser {
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

    expect(type) {
        const token = this.accept(type);
        if (token === null) {
            throw `Unexpected token ${JSON.stringify(this.token)}`;
        }
        return token;
    }

    _parse(expect_open = true) {
        const elements = [];

        if (expect_open) {
            this.expect(Tokenizer.Token.OPEN);
        }

        while (true) {
            let element = this.accept([
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

    parse() {
        const sexpr = this._parse();

        // A full document has one top-level s-expression.
        if(!this.token) {
            return sexpr;
        }

        // A document fragment has many top-level s-expressions, so keep parsing until it's done.
        const elements = [sexpr];

        while(this.token) {
            elements.push(this._parse());
        }

        return new SExprParser(elements)
    }
}

export class SExprParser {
    constructor(elements) {
        this.elements = elements;
        this.index = 0;
    }

    get element() {
        if (this.index > this.elements.length - 1) {
            return null;
        } else {
            return this.elements[this.index];
        }
    }

    next() {
        this.index++;
        return this.element;
    }

    reset() {
        this.index = 0;
    }

    unbox(value) {
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
                throw `Can not unbox token type ${value.type}`;
            }
        } else if (value instanceof SExprParser) {
            return value;
        } else {
            throw `Can not unbox value ${JSON.stringify(value)}`;
        }
    }

    maybe(type, match = undefined) {
        const e = this.element;
        if (e instanceof Tokenizer.Token && e.type === type) {
            const value = this.unbox(e);

            if (match !== undefined) {
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
        } else if (type === undefined) {
            this.next();
            return e;
        } else {
            return null;
        }
    }

    maybe_atom(match = undefined) {
        return this.maybe(Tokenizer.Token.ATOM, match);
    }

    maybe_number(match = undefined) {
        return this.maybe(Tokenizer.Token.NUMBER, match);
    }

    maybe_string(match = undefined) {
        return this.maybe(Tokenizer.Token.STRING, match);
    }

    maybe_list() {
        return this.maybe("list");
    }

    expect(type, match = undefined) {
        const val = this.maybe(type, match);

        if (val === null) {
            throw `Expected ${type} found ${JSON.stringify(this.element)}`;
        }

        return val;
    }

    expect_atom(match = undefined) {
        return this.expect(Tokenizer.Token.ATOM, match);
    }

    expect_number(match = undefined) {
        return this.expect(Tokenizer.Token.NUMBER, match);
    }

    expect_string(match = undefined) {
        return this.expect(Tokenizer.Token.STRING, match);
    }

    expect_list(match = undefined) {
        return this.expect("list", match);
    }

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

    expect_expr(name) {
        const e = this.maybe_expr(name);
        if (e === null) {
            throw `Expected expression ${name}, have ${JSON.stringify(this.element)}`;
        }
        return e;
    }

    *iter_exprs(name) {
        const start_index = this.index;

        for (const e of this.elements) {
            if (e instanceof SExprParser && e.maybe_atom(name)) {
                yield e;
                e.reset();
            }
        }

        this.index = start_index;
    }

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

    maybe_pair_any(name) {
        const val = this.maybe_pair(name, undefined);
        if (val) {
            return this.unbox(val);
        } else {
            return null;
        }
    }

    maybe_pair_atom(name) {
        return this.maybe_pair(name, Tokenizer.Token.ATOM);
    }

    maybe_pair_string(name) {
        return this.maybe_pair(name, Tokenizer.Token.STRING);
    }

    maybe_pair_number(name) {
        return this.maybe_pair(name, Tokenizer.Token.NUMBER);
    }

    maybe_pair_list(name) {
        return this.maybe_pair(name, "list");
    }

    expect_pair(name, type) {
        const v = this.maybe_pair(name, type);
        if (v === null) {
            throw `Expected pair ${name}, found ${JSON.stringify(this.element)}`;
        }
        return v;
    }

    expect_pair_atom(name) {
        return this.expect_pair(name, Tokenizer.Token.ATOM);
    }

    expect_pair_string(name) {
        return this.expect_pair(name, Tokenizer.Token.STRING);
    }

    expect_pair_number(name) {
        return this.expect_pair(name, Tokenizer.Token.NUMBER);
    }

    expect_pair_list(name) {
        return this.expect_pair(name, "list");
    }
}

export function parse(str_or_tokens) {
    return new Parser(str_or_tokens).parse();
}
