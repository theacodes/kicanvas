/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { Constructor } from "../types";

/**
 * CustomElement context, used to manage shared state.
 *
 * Elements can provide state in the form of context to child elements using
 * provideContext() and child elements can request context from ancestors
 * using requestContext().
 *
 * Loosely based on https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md,
 * but *greatly* simplified.
 */

export type ContextRequestCallback<T = unknown> = (context: T) => void;

/**
 * Context request event
 *
 * Dispatch this event to request context from ancestors. Ancestors can listen
 * for the event and invoke the provided callback to provide context. Invoking
 * the callback will automatically stop the event's propagation.
 */
export class ContextRequestEvent<T = unknown> extends Event {
    static type = "context-request";

    constructor(
        public context_name: string,
        private _callback: ContextRequestCallback<T>,
    ) {
        super(ContextRequestEvent.type, {
            bubbles: true,
            cancelable: true,
            composed: true,
        });
    }

    callback(context: T) {
        this.stopPropagation();
        this._callback(context);
    }
}

/**
 * Requests context from ancestors asynchronously.
 *
 * Handles the details of dispatching the ContextRequestEvent and wraps it
 * all up in a promise. Note that if no ancestor provides the context, the
 * promise will never resolve.
 */
export async function requestContext<T = unknown>(
    target: EventTarget,
    context_name: string,
): Promise<T> {
    return new Promise((resolve) => {
        target.dispatchEvent(
            new ContextRequestEvent<T>(context_name, (context: T) => {
                resolve(context);
            }),
        );
    });
}

/**
 * Provides context to descendants.
 *
 * Handles the details of listening to ContextRequestEvents and responding
 * with the given context if it matches the context name.
 */
export function provideContext<T>(
    target: EventTarget,
    context_name: string,
    context: T,
) {
    target.addEventListener(ContextRequestEvent.type, (e) => {
        const request_event = e as ContextRequestEvent<T>;
        if (request_event.context_name == context_name) {
            request_event.callback(context);
        }
    });
}

/**
 * Like requestContext but used when the provider passes a function that
 * should be called to obtain the context. Useful for setting up context
 * providers in constructors before the actual context value is available.
 */
export async function requestLazyContext<T = unknown>(
    target: EventTarget,
    context_name: string,
): Promise<T> {
    return (await requestContext<() => T>(target, context_name))();
}

/**
 * Like provideContext but used with requestLazyContext
 */
export async function provideLazyContext<T = unknown>(
    target: EventTarget,
    context_name: string,
    context: () => T,
) {
    provideContext(target, context_name, context);
}

/**
 * Mixin used to add provideContext and requestContext methods.
 */
export function WithContext<T extends Constructor<HTMLElement>>(Base: T) {
    return class WithContext extends Base {
        constructor(...args: any[]) {
            super(...args);
        }

        /** Request context from ancestors */
        async requestContext<T = unknown>(context_name: string) {
            return await requestContext<T>(this, context_name);
        }

        /** Provide context to descendants */
        provideContext<T = unknown>(context_name: string, context: T) {
            provideContext<T>(this, context_name, context);
        }

        /** Request context from ancestors lazily */
        async requestLazyContext<T = unknown>(context_name: string) {
            return await requestLazyContext<T>(this, context_name);
        }

        /** Provide context to descendants lazily */
        provideLazyContext<T = unknown>(
            context_name: string,
            context: () => T,
        ) {
            provideLazyContext<T>(this, context_name, context);
        }
    };
}
