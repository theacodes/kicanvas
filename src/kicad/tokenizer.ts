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

const EOF = "\x04";

export class Token {
    static OPEN = Symbol("opn");
    static CLOSE = Symbol("clo");
    static ATOM = Symbol("atm");
    static NUMBER = Symbol("num");
    static STRING = Symbol("str");

    /**
     * Create a new Token
     */
    constructor(
        public type: symbol,
        public value: any = null,
    ) {}
}

function is_digit(c: string) {
    return c >= "0" && c <= "9";
}

function is_alpha(c: string) {
    return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
}

function is_whitespace(c: string) {
    return c === EOF || c === " " || c === "\n" || c === "\r" || c === "\t";
}

function is_atom(c: string) {
    return (
        is_alpha(c) ||
        is_digit(c) ||
        [
            "_",
            "-",
            ":",
            "!",
            ".",
            "[",
            "]",
            "{",
            "}",
            "@",
            "*",
            "/",
            "&",
            "#",
            "%",
            "+",
            "=",
            "~",
            "$",
        ].includes(c)
    );
}

function error_context(input: string, index: number) {
    let start = input.slice(0, index).lastIndexOf("\n");
    if (start < 0) start = 0;
    let end = input.slice(index).indexOf("\n");
    if (end < 0) end = 20;
    return input.slice(start, index + end);
}

enum State {
    none,
    string,
    number,
    atom,
    hex,
}

export function* tokenize(input: string) {
    const open_token = new Token(Token.OPEN);
    const close_token = new Token(Token.CLOSE);
    let state: State = State.none;
    let start_idx = 0;
    let escaping = false;

    for (let i = 0; i < input.length + 1; i++) {
        const c: string = i < input.length ? input[i]! : EOF;

        if (state == State.none) {
            if (c === "(") {
                yield open_token;
                continue;
            } else if (c === ")") {
                yield close_token;
                continue;
            } else if (c === '"') {
                state = State.string;
                start_idx = i;
                continue;
            } else if (c === "-" || c == "+" || is_digit(c)) {
                state = State.number;
                start_idx = i;
                continue;
            } else if (is_alpha(c) || ["*", "&", "$", "/", "%"].includes(c)) {
                state = State.atom;
                start_idx = i;
                continue;
            } else if (is_whitespace(c)) {
                continue;
            } else {
                throw new Error(
                    `Unexpected character at index ${i}: ${c}\nContext: ${error_context(
                        input,
                        i,
                    )}`,
                );
            }
        } else if (state == State.atom) {
            if (is_atom(c)) {
                continue;
            } else if (c === ")" || is_whitespace(c)) {
                yield new Token(Token.ATOM, input.substring(start_idx, i));
                state = State.none;
                if (c === ")") {
                    yield close_token;
                }
            } else {
                throw new Error(
                    `Unexpected character while tokenizing atom at index ${i}: ${c}\nContext: ${error_context(
                        input,
                        i,
                    )}`,
                );
            }
        } else if (state == State.number) {
            if (c === "." || is_digit(c)) {
                continue;
            } else if (c.toLowerCase() === "x") {
                /* Hex number */
                state = State.hex;
                continue;
            } else if (
                ["+", "-", "a", "b", "c", "d", "e", "f"].includes(
                    c.toLowerCase(),
                )
            ) {
                /* Special case of UUID value */
                state = State.atom;
                continue;
            } else if (is_atom(c)) {
                /* It's actually an atom, e.g. +3V3 */
                state = State.atom;
                continue;
            } else if (c === ")" || is_whitespace(c)) {
                yield new Token(
                    Token.NUMBER,
                    parseFloat(input.substring(start_idx, i)),
                );
                state = State.none;
                if (c === ")") {
                    yield close_token;
                }
                continue;
            } else {
                throw new Error(
                    `Unexpected character at index ${i}: ${c}, expected numeric.\nContext: ${error_context(
                        input,
                        i,
                    )}`,
                );
            }
        } else if (state == State.hex) {
            if (
                is_digit(c) ||
                ["a", "b", "c", "d", "e", "f", "_"].includes(c.toLowerCase())
            ) {
                continue;
            } else if (c === ")" || is_whitespace(c)) {
                const hexstr = input.substring(start_idx, i).replace("_", "");
                yield new Token(Token.NUMBER, Number.parseInt(hexstr, 16));
                state = State.none;
                if (c === ")") {
                    yield close_token;
                }
                continue;
            } else if (is_atom(c)) {
                // It was actually an atom.
                state = State.atom;
                continue;
            } else {
                throw new Error(
                    `Unexpected character at index ${i}: ${c}, expected hexadecimal.\nContext: ${error_context(
                        input,
                        i,
                    )}`,
                );
            }
        } else if (state == State.string) {
            if (!escaping && c === '"') {
                yield new Token(
                    Token.STRING,
                    input
                        .substring((start_idx ?? 0) + 1, i)
                        .replaceAll("\\n", "\n")
                        .replaceAll("\\\\", "\\"),
                );
                state = State.none;
                escaping = false;
                continue;
            } else if (!escaping && c === "\\") {
                escaping = true;
                continue;
            } else {
                escaping = false;
                continue;
            }
        } else {
            throw new Error(
                `Unknown tokenizer state ${state}\nContext: ${error_context(
                    input,
                    i,
                )}`,
            );
        }
    }
}

export type List = (string | number | List)[];

function* listify_tokens(tokens: Generator<Token>): Generator<List> {
    let token;
    let it;

    while (true) {
        it = tokens.next();
        token = it.value;

        switch (token?.type) {
            case Token.ATOM:
            case Token.STRING:
            case Token.NUMBER:
                yield token.value;
                break;
            case Token.OPEN:
                yield Array.from(listify_tokens(tokens)) as any;
                break;
            case Token.CLOSE:
            case undefined:
                return;
        }
    }
}

export function listify(src: string): List {
    const tokens = tokenize(src);
    return Array.from(listify_tokens(tokens));
}
