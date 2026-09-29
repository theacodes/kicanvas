/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "chai";

import { Vec2 } from "../../src/base/math";
import { P, T, log, parse_expr } from "../../src/kicad/parser";
import { listify, type List } from "../../src/kicad/tokenizer";

suite("kicad.parser.parse_expr(): s-expression parser", function () {
    test("converts lists without modifying the input expression", function () {
        const values: List = ["values", 1, "skip", 3];
        const expr: List = ["root", ["factor", 2], values];
        Object.freeze(values);
        Object.freeze(expr);
        const result = parse_expr(
            expr,
            P.start("root"),
            P.pair("factor", T.number),
            P.list("values", (obj, name, value) =>
                typeof value === "number" ? obj["factor"] * value : undefined,
            ),
        );
        assert.deepEqual(result["values"], [2, undefined, 6]);
        assert.notStrictEqual(result["values"], values);
        assert.deepEqual(expr, [
            "root",
            ["factor", 2],
            ["values", 1, "skip", 3],
        ]);
    });

    test("summarizes repeated warnings and resets between parsing batches", async function () {
        await Promise.resolve();
        const messages: string[] = [];
        const original_warn = log.warn;
        log.warn = (message: string) => messages.push(message);
        try {
            for (let i = 0; i < 20; i++) {
                parse_expr(["first", ["future_field", i]], P.start("first"));
            }
            parse_expr(["second", ["future_field", 1]], P.start("second"));
            await Promise.resolve();
            assert.lengthOf(messages, 2);
            assert.include(messages[0]!, "first");
            assert.include(messages[0]!, "(future_field 0)");
            assert.include(messages[0]!, "20 occurrences");
            assert.include(messages[1]!, "second");

            parse_expr(["first", ["future_field", 9]], P.start("first"));
            await Promise.resolve();
            assert.lengthOf(messages, 3);
            assert.include(messages[2]!, "(future_field 9)");
            assert.notInclude(messages[2]!, "occurrences");
        } finally {
            log.warn = original_warn;
        }
    });

    test("bounds diagnostic previews without traversing large nested data", async function () {
        await Promise.resolve();
        const messages: string[] = [];
        const original_warn = log.warn;
        log.warn = (message: string) => messages.push(message);
        try {
            const large: List = ["points", ["nested", ["deeper", "value"]]];
            Object.defineProperty(large, 100_000, {
                get() {
                    throw new Error("Diagnostic traversed omitted data");
                },
            });
            parse_expr(
                ["root", ["future_field", "x".repeat(10_000), large]],
                P.start("root"),
            );
            await Promise.resolve();
            assert.lengthOf(messages, 1);
            assert.isBelow(messages[0]!.length, 400);
            assert.include(messages[0]!, "future_field");
            assert.throws(
                () => parse_expr([large], P.start("root")),
                "Expression must start with root",
            );
        } finally {
            log.warn = original_warn;
        }
    });

    test(".start()", function () {
        const res = parse_expr(listify("thing 1 2"), P.start("thing"));
        assert.deepEqual(res, {});

        assert.throws(() => {
            parse_expr(listify("notthing 1 2"), P.start("thing"));
        });
    });

    test(".positional()", function () {
        let res;

        res = parse_expr(
            listify("1 2"),
            P.positional("first"),
            P.positional("second"),
        );
        assert.deepEqual(res, { first: 1, second: 2 });

        res = parse_expr(
            listify("1 a"),
            P.positional("first"),
            P.positional("second", T.number),
        );
        assert.deepEqual(res, { first: 1, second: undefined });

        res = parse_expr(
            listify("1 2"),
            P.positional("first", T.string),
            P.positional("second", T.number),
        );
        assert.deepEqual(res, { first: undefined, second: 2 });
    });

    test(".pair()", function () {
        const res = parse_expr(
            listify("(a 1) (c 3) (b 2) d"),
            P.pair("a"),
            P.pair("b"),
            P.pair("c"),
            P.pair("d"),
        );
        assert.deepEqual(res, { a: 1, b: 2, c: 3, d: undefined });
    });

    test(".list()", function () {
        const res = parse_expr(
            listify("(a 1) (b 1 2 3) (c c1 c2 3) (d)"),
            P.list("a"),
            P.list("b"),
            P.list("c"),
            P.list("d"),
        );
        assert.deepEqual(res, {
            a: [1],
            b: [1, 2, 3],
            c: ["c1", "c2", 3],
            d: [],
        });
    });

    test(".collection()", function () {
        const res = parse_expr(
            listify("(foo a 1) (bar b 2) (baz c 3) (foo d 4)"),
            P.collection("foos_and_bars", "foo"),
            P.collection("foos_and_bars", "bar"),
            P.collection("bazs", "baz"),
        );
        assert.deepEqual(res, {
            foos_and_bars: [
                ["foo", "a", 1],
                ["bar", "b", 2],
                ["foo", "d", 4],
            ],
            bazs: [["baz", "c", 3]],
        });
    });

    test(".dict()", function () {
        const res = parse_expr(
            listify("(def a 1) (def b 2) (def c (3 4)) (def d 5 6 7)"),
            P.dict("defs", "def"),
        );
        assert.deepEqual(res, {
            defs: {
                a: [1],
                b: [2],
                c: [[3, 4]],
                d: [5, 6, 7],
            },
        });
    });

    test(".atom()", function () {
        const defs = [
            P.atom("locked"),
            P.atom("enabled", ["yes", "no"]),
            P.atom("horizontal", ["left", "right"]),
            P.atom("color", ["blue", "green", "red"]),
            P.atom("vertical", ["top", "bottom"]),
        ];

        const cases = [
            {
                src: "locked yes left (blue) top",
                expected: {
                    locked: true,
                    enabled: "yes",
                    horizontal: "left",
                    color: "blue",
                    vertical: "top",
                },
            },
            {
                src: "no right top red",
                expected: {
                    enabled: "no",
                    horizontal: "right",
                    color: "red",
                    vertical: "top",
                },
            },
            {
                src: "(yes) (top) (bottom)",
                expected: {
                    enabled: "yes",
                    vertical: "bottom",
                },
            },
        ];

        for (const { src, expected } of cases) {
            const res = parse_expr(listify(src), ...defs);
            assert.deepEqual(res, expected);
        }
    });

    test(".expr()", function () {
        let res;

        res = parse_expr(listify("(expr 1 2 3)"), P.expr("expr"));
        assert.deepEqual(res, {
            expr: ["expr", 1, 2, 3],
        });

        res = parse_expr(listify("(expr)"), P.expr("expr"));
        assert.deepEqual(res, {
            expr: ["expr"],
        });

        res = parse_expr(listify("expr"), P.expr("expr"));
        assert.deepEqual(res, {
            expr: "expr",
        });
    });

    test(".object()", function () {
        const res = parse_expr(
            listify("(thing (a 1) (b 2) yes)"),
            P.object(
                "thing",
                { c: 3 },
                P.pair("a"),
                P.pair("b"),
                P.atom("enabled", ["yes", "no"]),
            ),
        );
        assert.deepEqual(res, {
            thing: { a: 1, b: 2, c: 3, enabled: "yes" },
        });
    });

    test(".item()", function () {
        const res = parse_expr(
            listify("(item (a 1) (b 2) yes)"),
            P.item("item", TestItem, "arg1", "arg2"),
        );

        assert.deepEqual(res, {
            item: new TestItem(
                ["item", ["a", 1], ["b", 2], "yes"],
                "arg1",
                "arg2",
            ),
        });
    });

    test(".vec2()", function () {
        const res = parse_expr(
            listify("(at 1 2) (xy 3 4)"),
            P.vec2("at"),
            P.vec2("xy"),
        );

        assert.deepEqual(res, {
            at: new Vec2(1, 2),
            xy: new Vec2(3, 4),
        });
    });

    test("with complex data", function () {
        const src = `
            (example
                abcdef
                4
                (layer layer1)
                (layers layer1 layer2)
                type_a
                (hide)
                locked
                (width 0.5)
                (start 1 2)
                (gr_rect 1 2 3)
                (gr_poly a b c)
                (pts (xy 1 1) (xy 2 2)))`;

        const expr = listify(src);

        const res = parse_expr(
            expr[0] as List,
            P.start("example"),
            P.positional("text", T.string),
            P.positional("size", T.number),
            P.pair("layer", T.string),
            P.list("layers", T.string),
            P.list("start", T.number),
            P.pair("width", T.number),
            P.collection("graphics", "gr_rect", T.item(TestItem)),
            P.collection("graphics", "gr_poly", T.item(TestItem)),
            P.atom("type", ["type_a", "type_b", "type_c"]),
            P.atom("hide"),
            P.atom("locked"),
            P.list("pts", T.item(TestItem)),
        );

        assert.deepEqual(res, {
            text: "abcdef",
            size: 4,
            layer: "layer1",
            layers: ["layer1", "layer2"],
            start: [1, 2],
            width: 0.5,
            graphics: [
                new TestItem(["gr_rect", 1, 2, 3]),
                new TestItem(["gr_poly", "a", "b", "c"]),
            ],
            type: "type_a",
            hide: true,
            locked: true,
            pts: [new TestItem(["xy", 1, 1]), new TestItem(["xy", 2, 2])],
        });
    });
});

class TestItem {
    args: any[];
    constructor(
        public expr: any,
        ...args: any[]
    ) {
        this.args = args;
    }
}
