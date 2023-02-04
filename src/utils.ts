/*
    Copyright (c) 2021 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export async function $onload() {
    const p: Promise<void> = new Promise((resolve) => {
        window.addEventListener("load", () => {
            resolve();
        });
    });
    return p;
}

/* Returns a HTMLElement give the ID or the element itself. */
export function $e(x: string | HTMLElement): HTMLElement | null {
    if (typeof x === "string") {
        return document.getElementById(x);
    }
    return x;
}

export function $s(
    el_or_selector: HTMLElement | DocumentFragment | ShadowRoot | string,
    selector?: string,
) {
    if (!selector) {
        return document.querySelectorAll(el_or_selector as string);
    } else {
        return (el_or_selector as HTMLElement).querySelectorAll(selector);
    }
}

export function $q(
    el_or_selector: HTMLElement | DocumentFragment | ShadowRoot | string,
    selector?: string,
) {
    if (!selector) {
        return document.querySelector(el_or_selector as string);
    } else {
        return (el_or_selector as HTMLElement).querySelector(selector);
    }
}

export function $make(
    tag_name: string,
    properties: Record<string, string | HTMLElement[]> = {},
) {
    const elem = document.createElement(tag_name);
    for (const [name, value] of Object.entries(properties)) {
        if (name === "children") {
            for (const child of value as HTMLElement[]) {
                elem.appendChild(child);
            }
        } else if (name === "innerText") {
            elem.innerText = value as string;
        } else if (name === "innerHTML") {
            elem.innerHTML = value as string;
        } else {
            elem.setAttribute(name, value as string);
        }
    }
    return elem;
}

export function $draw(c: () => void) {
    window.requestAnimationFrame(c);
}

/* Adds an event listener. */
export function $on(
    elem: EventTarget,
    event: string,
    callback: ((event: Event) => any) | ((event: CustomEvent) => any),
    strict = true,
) {
    if (!strict && (elem === null || elem === undefined)) {
        return;
    }
    elem.addEventListener(event, callback as (event: Event) => any);
}

export function $event(
    e: EventTarget,
    name: string,
    detail: any,
    bubble = true,
) {
    e.dispatchEvent(
        new CustomEvent(name, {
            detail: detail,
            bubbles: bubble,
        }),
    );
}

export function $template(content: string) {
    const template = $make("template", {
        innerHTML: content,
    }) as HTMLTemplateElement;
    return (template.content.cloneNode(true) as DocumentFragment)
        .firstElementChild;
}
