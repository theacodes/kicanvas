/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export function first<T>(iterable: Iterable<T>): T | undefined {
    return iterable[Symbol.iterator]().next().value;
}
