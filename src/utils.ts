/*
    Copyright (c) 2021 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export async function $onload() {
    const p: Promise<void> = (
        new Promise((resolve) => {
            window.addEventListener("load", () => {
                resolve();
            });
        })
    );
    return p;
}

/* Returns a HTMLElement give the ID or the element itself. */
export function $e(x) {
    if (typeof x === "string") {
        return document.getElementById(x);
    }
    return x;
}

export function $s(el_or_selector, selector = undefined) {
    if (typeof el_or_selector === "string") {
        return document.querySelectorAll(el_or_selector);
    } else {
        return el_or_selector.querySelectorAll(selector);
    }
}

export function $q(el_or_selector, selector = undefined) {
    if (typeof el_or_selector === "string") {
        return document.querySelector(el_or_selector);
    } else {
        return el_or_selector.querySelector(selector);
    }
}

export function $make(tag_name, properties = {}) {
    const elem = document.createElement(tag_name);
    for (const [name, value] of Object.entries(properties)) {
        if (name === "children") {
            for (const child of value as IterableIterator<HTMLElement>) {
                elem.appendChild(child);
            }
        } else if (name === "innerText") {
            elem.innerText = value;
        } else if (name === "innerHTML") {
            elem.innerHTML = value;
        } else {
            elem.setAttribute(name, value);
        }
    }
    return elem;
}

export function $draw(c) {
    window.requestAnimationFrame(c);
}

/* Adds an event listener. */
export function $on(elem, event, callback, strict = true) {
    if (!strict && (elem === null || elem === undefined)) {
        return;
    }
    elem.addEventListener(event, callback);
}

export function $event(e, name, detail, bubble = true) {
    e.dispatchEvent(
        new CustomEvent(name, {
            detail: detail,
            bubbles: bubble,
        })
    );
}

export function $template(content) {
    const template = $make("template", {
        innerHTML: content,
    });
    return template.content.cloneNode(true).firstElementChild;
}
