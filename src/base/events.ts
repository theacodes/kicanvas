/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { IDisposable } from "./disposable";

export function disposable_listener<
    K extends keyof GlobalEventHandlersEventMap,
>(
    target: EventTarget,
    type: K,
    handler: (event: GlobalEventHandlersEventMap[K]) => void,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable;
export function disposable_listener(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject | null,
    use_capture_or_options?: boolean | AddEventListenerOptions,
): IDisposable;
export function disposable_listener(
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
