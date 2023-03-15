/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { IDisposable } from "./disposable";

/**
 * Adds an event listener and wraps it as a Disposable. When disposed, the
 * event listener is removed from the target.
 */
export function listen<K extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    type: K,
    handler: (event: GlobalEventHandlersEventMap[K]) => void,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable;
export function listen(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject | null,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable;
export function listen(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject | null,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable {
    target.addEventListener(type, handler, use_capture_or_options);
    return {
        dispose: () => {
            target.removeEventListener(type, handler, use_capture_or_options);
        },
    };
}

/**
 * Adds a delegated event listener, which listens for events on `parent` that
 * occur from or within children matching `match`.
 */
export function delegate<K extends keyof GlobalEventHandlersEventMap>(
    target: EventTarget,
    match: string,
    type: K,
    handler: (
        event: GlobalEventHandlersEventMap[K],
        source: HTMLElement,
    ) => void,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable;
export function delegate(
    parent: EventTarget,
    match: string,
    type: string,
    handler: (evt: Event, source: HTMLElement) => void,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable;
export function delegate(
    parent: EventTarget,
    match: string,
    type: string,
    handler: (evt: Event, source: HTMLElement) => void,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable {
    return listen(
        parent,
        type,
        (e) => {
            const el = (e.target as HTMLElement).closest(match);
            if (!el) {
                return;
            }
            handler(e, el as HTMLElement);
        },
        use_capture_or_options,
    );
}
