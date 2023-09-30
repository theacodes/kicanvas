/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export function first<T>(iterable: Iterable<T>): T | undefined {
    return iterable[Symbol.iterator]().next().value;
}

export type MapCallbackFn<T, U> = (value: T, index: number) => U;

export function* map<T, U>(
    iterable: Iterable<T>,
    callback: MapCallbackFn<T, U>,
): Generator<U, any, undefined> {
    let n = 0;
    for (const i of iterable) {
        yield callback(i, n);
        n++;
    }
}

export function isEmpty(iterable: Iterable<unknown>) {
    for (const _ of iterable) {
        return false;
    }
    return true;
}

export function length(iterable: Iterable<unknown>) {
    let n = 0;
    for (const _ of iterable) {
        n++;
    }
    return n;
}
