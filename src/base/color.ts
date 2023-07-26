/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class Color {
    constructor(
        public r: number,
        public g: number,
        public b: number,
        public a: number = 1,
    ) {}

    copy() {
        return new Color(this.r, this.g, this.b, this.a);
    }

    static get transparent_black() {
        return new Color(0, 0, 0, 0);
    }

    static get black() {
        return new Color(0, 0, 0, 1);
    }

    static get white() {
        return new Color(1, 1, 1, 1);
    }

    static from_css(str: string) {
        let r, g, b, a;

        /* Hex color */
        if (str[0] == "#") {
            str = str.slice(1);
            // #ABC -> #AABBCC
            if (str.length == 3) {
                str = `${str[0]}${str[0]}${str[1]}${str[1]}${str[2]}${str[2]}`;
            }

            // #AABBCC -> #AABBCCDD
            if (str.length == 6) {
                str = `${str}FF`;
            }

            [r, g, b, a] = [
                parseInt(str.slice(0, 2), 16) / 255,
                parseInt(str.slice(2, 4), 16) / 255,
                parseInt(str.slice(4, 6), 16) / 255,
                parseInt(str.slice(6, 8), 16) / 255,
            ];
        } else if (str.startsWith("rgb")) {
            // rgb(0, 0, 0) -> rgba(0, 0, 0, 1);
            if (!str.startsWith("rgba")) {
                str = `rgba(${str.slice(4, -1)}, 1)`;
            }
            str = str.trim().slice(5, -1);

            const parts = str.split(",");

            if (parts.length != 4) {
                throw new Error(`Invalid color ${str}`);
            }

            [r, g, b, a] = [
                parseFloat(parts[0]!) / 255,
                parseFloat(parts[1]!) / 255,
                parseFloat(parts[2]!) / 255,
                parseFloat(parts[3]!),
            ];
        } else {
            throw new Error(`Unable to parse CSS color string ${str}`);
        }

        return new Color(r, g, b, a);
    }

    to_css(): string {
        return `rgba(${this.r_255}, ${this.g_255}, ${this.b_255}, ${this.a})`;
    }

    to_array(): [number, number, number, number] {
        return [this.r, this.g, this.b, this.a];
    }

    get r_255() {
        return Math.round(this.r * 255);
    }

    set r_255(v) {
        this.r = v / 255;
    }

    get g_255(): number {
        return Math.round(this.g * 255);
    }

    set g_255(v) {
        this.g = v / 255;
    }

    get b_255(): number {
        return Math.round(this.b * 255);
    }

    set b_255(v) {
        this.b = v / 255;
    }

    get is_transparent_black() {
        return this.r == 0 && this.g == 0 && this.b == 0 && this.a == 0;
    }

    with_alpha(a: number) {
        const c = this.copy();
        c.a = a;
        return c;
    }

    desaturate() {
        // From KiCAD's COLOR4D::Desaturate
        if (this.r == this.g && this.r == this.b) {
            return this;
        }

        const [h, _, l] = rgb_to_hsl(this.r, this.g, this.b);

        return new Color(...hsl_to_rgb(h, 0.0, l));
    }

    mix(other: Color, amount: number) {
        return new Color(
            other.r * (1 - amount) + this.r * amount,
            other.g * (1 - amount) + this.g * amount,
            other.b * (1 - amount) + this.b * amount,
            this.a,
        );
    }
}

/**
 * Convert normalized RGB to HSL
 */
export function rgb_to_hsl(
    r: number,
    g: number,
    b: number,
): [number, number, number] {
    const max = Math.max(...[r, g, b]);
    const min = Math.min(...[r, g, b]);
    const l = (min + max) / 2;
    const d = max - min;
    let [h, s] = [NaN, 0];

    if (d !== 0) {
        s = l === 0 || l === 1 ? 0 : (max - l) / Math.min(l, 1 - l);

        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
        }

        h = h * 60;
    }

    return [h, s * 100, l * 100];
}

/**
 * Convert normalized HSL to RGB
 */
export function hsl_to_rgb(
    h: number,
    s: number,
    l: number,
): [number, number, number] {
    h = h % 360;

    if (h < 0) {
        h += 360;
    }

    s /= 100;
    l /= 100;

    function f(n: number) {
        const k = (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }

    return [f(0), f(8), f(4)];
}
