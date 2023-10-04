/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { IDisposable } from "./disposable";

/**
 * Waits the given number of milliseconds and resolves.
 */
export async function wait(delay: number) {
    return new Promise<void>((resolve) => {
        window.setTimeout(() => {
            resolve();
        }, delay);
    });
}

/**
 * Schedules a callback to be executed by the event loop.
 *
 * Equivalent to window.setTimeout(..., 0);
 */
export function later(callback: () => unknown) {
    window.setTimeout(() => {
        callback();
    }, 0);
}

/**
 * Schedules a callback to be executed when the browser is idle or
 * when deadline milliseconds have passed.
 */
export function when_idle(
    callback: () => unknown,
    deadline = 1000,
): IDisposable {
    const token = window.requestIdleCallback(
        () => {
            callback();
        },
        { timeout: deadline },
    );
    return {
        dispose: () => {
            window.cancelIdleCallback(token);
        },
    };
}

const enum DeferredOutcome {
    Resolved,
    Rejected,
}

/**
 * A promise that can be resolved or rejected imperatively.
 */
export class DeferredPromise<T> {
    #promise: Promise<T>;
    #resolve: (value: T) => void;
    #reject: (error: Error) => void;
    #outcome?: DeferredOutcome;
    #value?: T | Error;

    constructor() {
        this.#promise = new Promise<T>((resolve, reject) => {
            this.#resolve = resolve;
            this.#reject = reject;
        });
    }

    get rejected() {
        return this.#outcome === DeferredOutcome.Rejected;
    }

    get resolved() {
        return this.#outcome === DeferredOutcome.Resolved;
    }

    get settled() {
        return !!this.#outcome;
    }

    get value() {
        return this.#value;
    }

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((value: T) => TResult1 | PromiseLike<TResult1>)
            | undefined
            | null,
        onrejected?:
            | ((reason: any) => TResult2 | PromiseLike<TResult2>)
            | undefined
            | null,
    ): Promise<TResult1 | TResult2> {
        return this.#promise.then(onfulfilled, onrejected);
    }

    resolve(value: T) {
        this.#outcome = DeferredOutcome.Resolved;
        this.#value = value;
        this.#resolve(value);
    }

    reject(error: Error) {
        this.#outcome = DeferredOutcome.Rejected;
        this.#value = error;
        this.#reject(error);
    }
}

/**
 * A "Barrier" for waiting for a task to complete before taking an action.
 */
export class Barrier extends DeferredPromise<boolean> {
    get isOpen(): boolean {
        return this.resolved && this.value === true;
    }

    open(): void {
        this.resolve(true);
    }
}
