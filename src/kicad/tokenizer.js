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

export class Token {
    static OPEN = "opn";
    static CLOSE = "clo";
    static ATOM = "atm";
    static NUMBER = "num";
    static STRING = "str";

    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

function is_digit(c) {
    return c >= "0" && c <= "9";
}

function is_alpha(c) {
    return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
}

function is_whitespace(c) {
    return c === " " || c === "\n" || c === "\r" || c === "\t";
}

export function* tokenize(input) {
    const open_token = new Token(Token.OPEN);
    const close_token = new Token(Token.CLOSE);
    let state = null;
    let start_idx = null;
    let escaping = false;

    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if (state === null) {
            if (c === "(") {
                yield open_token;
                continue;
            } else if (c === ")") {
                yield close_token;
                continue;
            } else if (c === '"') {
                state = "string";
                start_idx = i;
                continue;
            } else if (c === "-" || c == "+" || is_digit(c)) {
                state = "number";
                start_idx = i;
                continue;
            } else if (is_alpha(c) || c == "*") {
                state = "atom";
                start_idx = i;
                continue;
            } else if (is_whitespace(c)) {
                continue;
            } else {
                throw `Unexpected character at index ${i}: ${c}`;
            }
        } else if (state === "atom") {
            if (
                is_alpha(c) ||
                is_digit(c) ||
                ["-", "_", ".", "*", "&"].includes(c)
            ) {
                continue;
            } else if (c === ")" || is_whitespace(c)) {
                yield new Token(Token.ATOM, input.substring(start_idx, i));
                state = null;
                if (c === ")") {
                    yield close_token;
                }
            } else {
                throw new Error(
                    `Unexpected character while tokenizing atom at index ${i}: ${c}.`
                );
            }
        } else if (state === "number") {
            if (c === "." || is_digit(c)) {
                continue;
            } else if (c.toLowerCase() === "x") {
                /* Hex number */
                state = "hex";
                continue;
            } else if (
                ["-", "a", "b", "c", "d", "e", "f"].includes(c.toLowerCase())
            ) {
                /* Special case of UUID value */
                state = "atom";
                continue;
            } else if (c === ")" || is_whitespace(c)) {
                yield new Token(
                    Token.NUMBER,
                    parseFloat(input.substring(start_idx, i))
                );
                state = null;
                if (c === ")") {
                    yield close_token;
                }
                continue;
            } else {
                throw `Unexpected character at index ${i}: ${c}, expected numeric.`;
            }
        } else if (state === "hex") {
            if (
                is_digit(c) ||
                ["a", "b", "c", "d", "e", "f", "_"].includes(c.toLowerCase())
            ) {
                continue;
            } else if (c === ")" || is_whitespace(c)) {
                const hexstr = input.substring(start_idx, i).replace("_", "");
                yield new Token(Token.NUMBER, Number.parseInt(hexstr, 16));
                state = null;
                if (c === ")") {
                    yield close_token;
                }
                continue;
            } else {
                throw `Unexpected character at index ${i}: ${c}, expected hexadecimal.`;
            }
        } else if (state === "string") {
            if (!escaping && c === '"') {
                yield new Token(
                    Token.STRING,
                    input.substring(start_idx + 1, i).replaceAll("\\n", "\n")
                );
                state = null;
                escaping = false;
                continue;
            } else if (c === "\\") {
                escaping = true;
                continue;
            } else {
                escaping = false;
                continue;
            }
        } else {
            throw `Unknown tokenizer state ${state}`;
        }
    }
}
