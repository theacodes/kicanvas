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

/**
 * A promise representing work that has not yet completed.
 */
export class Deferred<T> {
    readonly promise: Promise<T>;
    #resolve: (value: T) => void;
    #reject: (error: Error) => void;
    settled = false;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.#resolve = resolve;
            this.#reject = reject;
        });
    }

    async wait() {
        return await this.promise;
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
        return this.promise.then(onfulfilled, onrejected);
    }

    resolve(value: T) {
        this.settled = true;
        this.#resolve(value);
    }

    reject(error: Error) {
        this.settled = true;
        this.#reject(error);
    }
}
