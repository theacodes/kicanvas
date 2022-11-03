/*
    Copyright (c) 2021 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export async function $onload() {
    const p = new Promise((resolve) => {
        window.addEventListener("load", () => {
            resolve();
        });
    });
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
            for (const child of value) {
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

export async function wait_ms(s) {
    return new Promise((resolve) => {
        window.setTimeout(() => resolve(), s);
    });
}

/* Helper for working with template elements with simple interpolation. */
export class TemplateElement {
    constructor(id) {
        this._elem = $e(id);
        this._parent = this._elem.parentNode;
    }

    render(ctx) {
        let content = this._elem.innerHTML;
        content = content.replace(/\${(.*?)}/g, (_, g) => {
            return ObjectHelpers.get_property_by_path(ctx, g) || "";
        });
        const temp = $make("template", { innerHTML: content });
        return temp.content.firstElementChild.cloneNode(true);
    }

    render_to(elem, ctx, empty_target = true) {
        const target = $e(elem);
        if (empty_target) {
            DOMHelpers.remove_all_children(target);
        }
        const result = this.render(ctx);
        target.append(result);
        return result;
    }

    render_to_parent(ctx, empty_parent = true) {
        return this.render_to(this._parent, ctx, empty_parent);
    }

    render_all_to_parent(ctxes) {
        DOMHelpers.remove_all_children(this._parent);
        for (const [n, ctx] of ctxes.entries()) {
            ctx.$index = n;
            this._parent.append(this.render(ctx));
        }
    }
}

export const DOMHelpers = {
    remove_all_children: (node) => {
        var range = document.createRange();
        range.selectNodeContents(node);
        range.deleteContents();
    },
};

export const ObjectHelpers = {
    /* Why is it so hard to check if something is a string in JavaScript? */
    is_string(val) {
        return typeof val === "string" || val instanceof String;
    },

    /* Access nested object properties using a string, e.g. "order.email" */
    get_property_by_path: (obj, key, strict = true) => {
        const key_parts = key.split(".");
        let value = obj;
        for (const part of key_parts) {
            if (!strict && (value === undefined || value == null)) {
                return undefined;
            }
            value = value[part];
        }
        return value;
    },

    set_property_by_path: (obj, key, value, strict = true) => {
        const key_parts = key.split(".");
        let current_obj = obj;
        for (const part of key_parts.slice(0, -1)) {
            if (!strict && (part === undefined || part == null)) {
                return;
            }
            current_obj = current_obj[part];
        }

        current_obj[key_parts.pop()] = value;
    },
};

export const CanvasHelpers = {
    wait_for_font: async (name, timeout = 2) => {
        const css_font_string = `24px ${name}`;
        for (let i = 0; i < timeout * 10; i++) {
            const fonts = await document.fonts.load(css_font_string);
            if (fonts.length) {
                return;
            }
            await wait_ms(100);
        }

        throw `unable to load font ${name}`;
    },

    scale_for_device_pixel_ratio: (canvas, context) => {
        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        context.setTransform();
        context.scale(dpr, dpr);
    },

    screen_space_to_world_space: (canvas, context, x, y) => {
        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        const ss_pt = new DOMPoint(x - rect.left, y - rect.top);
        const mat = context.getTransform().inverse().scale(dpr, dpr);
        return mat.transformPoint(ss_pt);
    },
};
