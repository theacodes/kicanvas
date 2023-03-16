/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { is_array, is_iterable } from "./types";

export function as_array<T>(x: T | T[]): T[];
export function as_array<T>(x: T | readonly T[]): readonly T[];
export function as_array<T>(x: T | T[]): T[] {
    if (is_array(x)) {
        return x;
    }
    return [x];
}

export function iterable_as_array<T>(x: T | T[] | Iterable<T>): T[] {
    if (is_array(x)) {
        return x;
    }
    if (is_iterable(x)) {
        return Array.from(x);
    }
    return [x];
}
