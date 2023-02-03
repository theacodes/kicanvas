/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer I>
        ? Array<DeepPartial<I>>
        : DeepPartial<T[P]>;
};

export function assert_deep_partial<T>(
    actual: T,
    expected: DeepPartial<T>,
    assertfn = assert.deepEqual,
    path = "actual",
) {
    for (const [key, value] of Object.entries(expected)) {
        const local_path = `${path}.${key}`;
        switch (typeof value) {
            case "object":
                assert_deep_partial(actual[key], value, assertfn, local_path);
                break;
            default:
                assertfn(
                    actual[key],
                    value,
                    `Expected ${local_path} to be ${value} found ${actual[key]}`,
                );
        }
    }
}
