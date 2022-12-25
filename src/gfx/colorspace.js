/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export function hsla_to_rgba(h, s, l, a) {
    const k = (n) => (n + h / 30) % 12;
    const sl = s * Math.min(l, 1 - l);
    const f = (n) =>
        l - sl * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4), a];
}

export function rgba_hex_to_f4(rgba) {
    if (rgba[0] == "#") {
        rgba = rgba.slice(1);
    }

    if (rgba.length == 3) {
        rgba = `${rgba[0]}${rgba[0]}${rgba[1]}${rgba[1]}${rgba[2]}${rgba[2]}`;
    }

    if (rgba.length == 6) {
        rgba = `${rgba}FF`
    }

    let components = [rgba.slice(0, 2), rgba.slice(2, 4), rgba.slice(4, 6), rgba.slice(6, 8)];
    components = components.map((v) => parseInt(v, 16) / 255);

    return components;
}

export function rgba_to_f4(rgba) {
    if(!rgba.startsWith("rgba")) {
        rgba = `rgba(${rgba.slice(4, -1)}, 1)`;
    }
    rgba = rgba.trim().slice(5, -1);
    const parts = rgba.split(",").map((v) => parseFloat(v));
    const rgb = parts.slice(0, 3).map((v) => v / 255);
    const a = parts[3];
    return [...rgb, a];
}
