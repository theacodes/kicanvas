/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export type Primitive =
    | null
    | undefined
    | boolean
    | number
    | string
    | symbol
    | bigint;

export function is_primitive(value: unknown): value is Primitive {
    return (
        value === null ||
        (typeof value != "object" && typeof value != "function")
    );
}

export function is_string(value: unknown): value is string {
    return typeof value === "string";
}

export function is_number(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
}

export function is_iterable<T>(value: unknown): value is Iterable<T> {
    return (
        Array.isArray(value) ||
        typeof (value as any)?.[Symbol.iterator] === "function"
    );
}

export function is_array<T = unknown>(value: unknown): value is T[] {
    return Array.isArray(value);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function is_object(value: unknown): value is Object {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof RegExp) &&
        !(value instanceof Date)
    );
}

export type Constructor<T = unknown> = new (...args: any[]) => T;
