/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { AssertionError, assert } from "@esm-bundle/chai";
import * as utilities from "./utilities";

suite("test.utilities", function () {
    test(".assert_deep_partial()", function () {
        const actual = {
            string: "string",
            number: 1,
            bool: true,
            array: [1, 2],
            nested: {
                string: "nested_string",
                number: 42,
                nested: {
                    array: [3, 4],
                },
            },
        };

        // exact match
        utilities.assert_deep_partial(actual, actual);

        // partial match
        utilities.assert_deep_partial(actual, {
            bool: true,
            nested: {
                number: 42,
                nested: {
                    array: [3, 4],
                },
            },
        });

        // non-match at top level
        assert.throws(function () {
            utilities.assert_deep_partial(actual, {
                bool: false,
            });
        }, AssertionError);

        // non-match nested
        assert.throws(function () {
            utilities.assert_deep_partial(actual, {
                bool: true,
                nested: {
                    nested: {
                        array: [1],
                    },
                },
            });
        }, AssertionError);
    });
});
