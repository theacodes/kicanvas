/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { as_array } from "../base/array";
import { Color } from "../base/color";
import { Vec2 } from "../base/math";
import { Logger } from "../base/log";
import { is_number, is_string } from "../base/types";
import { listify, type List } from "./tokenizer";

const log = new Logger("kicanvas:parser");

enum Kind {
    // the first token in the expr (kind ...)
    start,
    // (1 2 3) -> {name: value}
    positional,
    // ((name value)) -> {name: value}
    pair,
    // ((name value value value ...)) -> {name: [value, value, value]}
    list,
    // (locked [he]) or mutually exclusively flags like (a | b | c)
    atom,
    // (name (kind 1) (kind 2) ...) -> {name: [item1, item2]}
    item_list,
    // generic expression (name 1 [2 3]) -> {name: [name, 1, [2, 3]]}
    expr,
}

type ListOrAtom = number | string | List;
type Obj = Record<string, any>;
type Item = {
    new (e: Parseable, ...args: any[]): any;
};
type TypeProcessor = (obj: Obj, name: string, e: ListOrAtom) => any;
type PropertyDefinition = {
    name: string;
    kind: Kind;
    accepts?: string[];
    fn: TypeProcessor;
};

/**
 * Type processors.
 * They transform an extracted value from the s-expr into the appropriate
 * data type requested by the property definition.
 */
export const T = {
    any(obj: Obj, name: string, e: ListOrAtom): any {
        return e;
    },
    boolean(obj: Obj, name: string, e: ListOrAtom): boolean {
        switch (e) {
            case "false":
            case "no":
                return false;
            case "true":
            case "yes":
                return true;
            default:
                return e ? true : false;
        }
    },
    string(obj: Obj, name: string, e: ListOrAtom): string | undefined {
        if (is_string(e)) {
            return e;
        } else {
            return undefined;
        }
    },
    number(obj: Obj, name: string, e: ListOrAtom): number | undefined {
        if (is_number(e)) {
            return e;
        } else {
            return undefined;
        }
    },
    item(type: Item, ...args: any[]): TypeProcessor {
        return (obj: Obj, name: string, e: ListOrAtom): any => {
            return new type(e as Parseable, ...args);
        };
    },
    object(start: any, ...defs: PropertyDefinition[]): TypeProcessor {
        return (obj: Obj, name: string, e: ListOrAtom) => {
            let existing = {};
            if (start !== null) {
                existing = obj[name] ?? start ?? {};
            }
            return {
                ...existing,
                ...parse_expr(e as List, P.start(name), ...defs),
            };
        };
    },
    vec2(obj: Obj, name: string, e: ListOrAtom): Vec2 {
        const el = e as number[];
        return new Vec2(el[1], el[2]);
    },
    color(obj: Obj, name: string, e: ListOrAtom): Color {
        const el = e as [string, number, number, number, number?];
        return new Color(el[1] / 255, el[2] / 255, el[3] / 255, el[4]);
    },
};

/**
 * Property definitions
 * These are used to describe the *shape* of the expected data along with the
 * type processor needed to convert it to the right value.
 */
export const P = {
    /**
     * Checks that the first item in the list is "name". For example,
     * (thing 1 2 3) would use start("thing").
     */
    start(name: string): PropertyDefinition {
        return {
            kind: Kind.start,
            name: name,
            fn: T.string,
        };
    },
    /**
     * Accepts a positional argument. For example,
     * (1 2 3) with positional("first", T.number) would end up with {first: 1}.
     */
    positional(
        name: string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.positional,
            name: name,
            fn: typefn,
        };
    },
    /**
     * Accepts a pair. For example, ((a 1)) with pair(a) would end up with {a: 1}.
     */
    pair(name: string, typefn: TypeProcessor = T.any): PropertyDefinition {
        return {
            kind: Kind.pair,
            name: name,
            accepts: [name],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                return typefn(obj, name, (e as any[])[1]);
            },
        };
    },
    /**
     * Accepts a list. For example ((a 1 2 3)) with list(a) would end up with {a: [1, 2, 3]}.
     */
    list(name: string, typefn: TypeProcessor = T.any): PropertyDefinition {
        return {
            kind: Kind.list,
            name: name,
            accepts: [name],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                return (e as List[]).slice(1).map((n) => typefn(obj, name, n));
            },
        };
    },
    /**
     * Accepts a collection. For example ((a 1) (a 2) (a 3)) with collection("items", "a")
     * would end up with {items: [[a, 1], [a, 2], [a, 3]]}.
     */
    collection(
        name: string,
        accept: string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.item_list,
            name: name,
            accepts: [accept],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                const list = obj[name] ?? [];
                list.push(typefn(obj, name, e));
                return list;
            },
        };
    },
    /**
     * Like collection but creates a map instead of an array.. For example
     * ((a key1 1) (a key2 2) (a key3 3)) with collection_map("items", "a")
     * would end up with {items: {key1: [a, key1, 2], ...}.
     */
    mapped_collection(
        name: string,
        accept: string,
        keyfn: (obj: any) => string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.item_list,
            name: name,
            accepts: [accept],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                const map = obj[name] ?? new Map();
                const val = typefn(obj, name, e);
                const key = keyfn(val);
                map.set(key, val);
                return map;
            },
        };
    },
    /**
     * Accepts a dictionary. For example ((thing a 1) (thing b 2) (thing c 3)) with
     * dict("things", "thing") would end up with {things: {a: 1, b: 2, c: 3}}.
     */
    dict(
        name: string,
        accept: string,
        typefn: TypeProcessor = T.any,
    ): PropertyDefinition {
        return {
            kind: Kind.item_list,
            name: name,
            accepts: [accept],
            fn: (obj: Obj, name: string, e: ListOrAtom) => {
                const el = e as [string, string, any];
                const rec = obj[name] ?? {};
                rec[el[1]] = typefn(obj, name, el.slice(2));
                return rec;
            },
        };
    },
    /**
     * Accepts an atom. For example (locked) and ((locked)) with atom("locked")
     * would end up with {locked: true}. Atoms can also be mutually exclusive
     * options, for example atom("align", ["left", "right"]) would process
     * (left) as {align: "left"} and (right) as {align: "right"}.
     */
    atom(name: string, values?: string[]): PropertyDefinition {
        let typefn: TypeProcessor;

        if (values) {
            typefn = T.string;
        } else {
            typefn = T.boolean;
            values = [name];
        }

        return {
            kind: Kind.atom,
            name: name,
            accepts: values,
            fn(obj: Obj, name: string, e: ListOrAtom) {
                // Handle "(atom)" as "atom".
                if (Array.isArray(e) && e.length == 1) {
                    e = e[0]!;
                }
                return typefn(obj, name, e);
            },
        };
    },
    /**
     * Accepts an expression. For example ((thing a 1 b)) with expr("thing")
     * would end up with {thing: ["thing", a, 1, b]}.
     */
    expr(name: string, typefn: TypeProcessor = T.any): PropertyDefinition {
        return {
            kind: Kind.expr,
            name: name,
            accepts: [name],
            fn: typefn,
        };
    },
    /**
     * Accepts an expression that describes a simple object with the given
     * property definitions. For example ((thing (a 1) (b 2))) with
     * object("thing", P.pair("a"), P.pair("b")) would end up with
     * {thing: {a: 1, b: 2}}.
     */
    object(
        name: string,
        start: any,
        ...defs: PropertyDefinition[]
    ): PropertyDefinition {
        return P.expr(name, T.object(start, ...defs));
    },
    /**
     * Accepts an expression that describes an object that can be used to
     * construct the given Item type. An Item is any class that takes
     * a List as its first constructor parameter.
     */
    item(name: string, item_type: Item, ...args: any[]): PropertyDefinition {
        return P.expr(name, T.item(item_type, ...args));
    },
    /**
     * Accepts an expression that describes a 2d vector. For example,
     * ((xy 1 2)) with vec2("xy") would end up with {xy: Vec2(1, 2)}.
     */
    vec2(name: string) {
        return P.expr(name, T.vec2);
    },
    color(name = "color") {
        return P.expr(name, T.color);
    },
};

export type Parseable = string | List;

export function parse_expr(expr: string | List, ...defs: PropertyDefinition[]) {
    if (is_string(expr)) {
        log.info(`Parsing expression with ${expr.length} chars`);
        expr = listify(expr);
        if (expr.length == 1 && Array.isArray(expr[0])) {
            expr = expr[0];
        }
    }

    const defs_map = new Map();

    let start_def;
    let n = 0;

    for (const def of defs) {
        if (def.kind == Kind.start) {
            start_def = def;
        } else if (def.kind == Kind.positional) {
            defs_map.set(n, def);
            n++;
        } else {
            for (const a of def.accepts!) {
                defs_map.set(a, def);
            }
        }
    }

    if (start_def) {
        const acceptable_start_strings = as_array(start_def.name);
        const first = expr.at(0) as string;

        if (!acceptable_start_strings.includes(first)) {
            throw new Error(
                `Expression must start with ${start_def.name} found ${first} in ${expr}`,
            );
        }

        expr = expr.slice(1);
    }

    const out: Record<string, any> = {};

    n = 0;
    for (const element of expr) {
        let def: PropertyDefinition | null = null;

        // bare string value can be an atom
        if (is_string(element)) {
            def = defs_map.get(element);
        }

        // If not an atom, a bare string or number can be a positional
        if (!def && (is_string(element) || is_number(element))) {
            def = defs_map.get(n);

            if (!def) {
                log.warn(
                    `no def for bare element ${element} at position ${n} in expression ${expr}`,
                );
                continue;
            }

            n++;
        }

        // list of elements
        if (!def && Array.isArray(element)) {
            def = defs_map.get(element[0]);
        }

        if (!def) {
            log.warn(
                `No def found for element ${element} in expression ${expr}`,
            );
            continue;
        }

        const value = def.fn(out, def.name, element);

        out[def.name] = value;
    }

    return out;
}
