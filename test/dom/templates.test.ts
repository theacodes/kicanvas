/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/
import { chaiDomDiff } from "@open-wc/semantic-dom-diff";
import { use, assert } from "@esm-bundle/chai";
import { html, literal } from "../../src/base/web-components/html";

use(chaiDomDiff);

suite("dom.templates", function () {
    test("no interpolated values", function () {
        assert.dom.equal(html`<div>hello!</div>`, `<div>hello!</div>`);
        assert.dom.equal(
            html`<div attr="value">
                hello!
                <p>nested</p>
            </div>`,
            `<div attr="value">hello!<p>nested</p></div>`,
        );
    });

    test("content interpolation with primitives", function () {
        assert.dom.equal(
            html`<div>hello, ${"name"}!</div>`,
            `<div>hello, name!</div>`,
        );
        assert.dom.equal(html`<div>hello, ${1}!</div>`, `<div>hello, 1!</div>`);
        assert.dom.equal(
            html`<div>hello, ${null}!</div>`,
            `<div>hello, !</div>`,
        );
        assert.dom.equal(
            html`<div>hello, ${true}!</div>`,
            `<div>hello, true!</div>`,
        );
    });

    test("content interpolation with primitive arrays", function () {
        assert.dom.equal(
            html`<div>hello, ${["name", 1, null, false]}!</div>`,
            `<div>hello, name1false!</div>`,
        );
    });

    test("content interpolation with elements", function () {
        const name_elm = html`<p>name</p>` as HTMLParagraphElement;
        const elm = html`<div>hello, ${name_elm}!</div>`;

        name_elm.title = "meep";

        assert.dom.equal(elm, `<div>hello, <p title="meep">name</p>!</div>`);

        assert(Object.is(elm.firstElementChild, name_elm));
    });

    test("content interpolation with multiple elements", function () {
        const child1 = html`<p>name</p>` as HTMLParagraphElement;
        const child2 = html`<p>last name</p>` as HTMLParagraphElement;
        const elm = html`<div>hello, ${[child1, child2]}!</div>`;

        child1.title = "meep";
        child2.title = "moop";

        assert.dom.equal(
            elm,
            `<div>hello, <p title="meep">name</p> <p title="moop">last name</p>!</div>`,
        );

        assert(Object.is(elm.firstElementChild, child1));
        assert(Object.is(elm.lastElementChild, child2));
    });

    test("content interpolation with dangerous text", function () {
        assert.dom.equal(
            html`<div>hello, ${"<p>evil</p>"}!</div>`,
            `<div>hello, &lt;p&gt;evil&lt;/p&gt;!</div>`,
        );
    });

    test("attribute interpolation with primitives", function () {
        assert.dom.equal(
            html`<div
                a="${"a"}"
                b="${1}"
                c="${true}"
                d="${false}"
                e="${null}"
                f="${""}"></div>`,
            `<div
                a="a"
                b="1"
                c=""
                f=""></div>`,
        );
    });

    test("mixed attribute interpolation", function () {
        assert.dom.equal(
            html`<div a="hello ${"a"}" b="${1} world" c="a ${"b"} c"></div>`,
            `<div
                a="hello a"
                b="1 world"
                c="a b c"></div>`,
        );
    });

    test("interpolation with literal", function () {
        const styles = literal`body {
            color: black;
        }`;
        assert.dom.equal(
            html`<style>
                ${styles}
            </style>`,
            `<style>
                body {
                    color: black;
                }
            </style>`,
        );
    });

    test("top-level interpolation with multiple children", function () {
        const child1 = html`<div>1</div>`;
        const child2 = html`<div>2</div>`;
        const fragment = html`${child1}${child2}`;
        const wrapped = html`<div>${fragment}</div>`;
        assert.dom.equal(wrapped, `<div><div>1</div><div>2</div></div>`);
    });
});
