/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { is_array } from "./types";

export function as_array<T>(x: T | T[]): T[];
export function as_array<T>(x: T | readonly T[]): readonly T[];
export function as_array<T>(x: T | T[]): T[] {
    return is_array(x) ? x : [x];
}
