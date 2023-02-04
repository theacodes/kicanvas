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
        const actual_value: any = (actual as any)[key];

        if (actual_value == null && value != null) {
            assertfn(
                actual_value,
                value,
                `Expected ${local_path} to be ${value} found ${actual_value}`,
            );
        }

        switch (typeof value) {
            case "object":
                assert_deep_partial(
                    (actual as any)[key],
                    value!,
                    assertfn,
                    local_path,
                );
                break;
            default:
                assertfn(
                    (actual as any)[key],
                    value,
                    `Expected ${local_path} to be ${value} found ${
                        (actual as any)[key]
                    }`,
                );
        }
    }
}
