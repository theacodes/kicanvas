/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * KiCAD text markup parser
 *
 * KiCAD uses basic text markup to express subscript, superscript, and overbar
 * text. For example "normal ^{superscript} _{subscript} ~{overbar}".
 */
export class Markup {
    root: MarkupNode;

    constructor(public text: string) {
        this.root = parse(tokenize(text));
        this.root.is_root = true;
    }
}

export class MarkupNode {
    is_root = false;
    subscript = false;
    superscript = false;
    overbar = false;
    text = "";
    children: MarkupNode[] = [];
}

type Token = {
    text?: string;
    open?: number;
    close?: number;
    control?: "^" | "_" | "~";
};

function* tokenize(str: string): Generator<Token> {
    const EOF = "\x04";
    let start_idx = 0;
    let control_char = null;
    let bracket_count = 0;

    for (let i = 0; i < str.length + 1; i++) {
        const c = i < str.length ? str[i] : EOF;
        switch (c) {
            case "_":
            case "^":
            case "~":
                control_char = c;
                break;
            case "{":
                if (control_char) {
                    bracket_count++;
                    yield { text: str.slice(start_idx, i - 1) };
                    yield { open: bracket_count, control: control_char };
                    control_char = null;
                    start_idx = i + 1;
                }
                break;
            case "}":
                if (bracket_count) {
                    yield { text: str.slice(start_idx, i) };
                    yield { close: bracket_count };
                    start_idx = i + 1;
                    bracket_count--;
                }
                break;
            case EOF:
                yield { text: str.slice(start_idx, i) };
                break;
            default:
                control_char = null;
                break;
        }
    }
}

function parse(tokens: Generator<Token>): MarkupNode {
    let token;

    const node = new MarkupNode();

    while ((token = tokens.next().value)) {
        if (token.text) {
            const c = new MarkupNode();
            c.text = token.text;
            node.children.push(c);
            continue;
        }
        if (token.open) {
            const c = parse(tokens);
            switch (token.control) {
                case "^":
                    c.superscript = true;
                    break;
                case "_":
                    c.subscript = true;
                    break;
                case "~":
                    c.overbar = true;
                    break;
            }
            node.children.push(c);
            continue;
        }
        if (token.close) {
            return node;
        }
    }

    return node;
}
