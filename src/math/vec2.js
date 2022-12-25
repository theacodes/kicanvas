/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    copy() {
        return new Vec2(...this);
    }

    set(x_or_other, y = null) {
        if (x_or_other instanceof this.constructor) {
            this.x = x_or_other.x;
            this.y = x_or_other.y;
        } else {
            this.x = x_or_other;
            this.y = y;
        }
    }

    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }

    get length() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    get normal() {
        return new Vec2(-this.y, this.x);
    }

    get angle() {
        return new Angle(Math.atan2(this.y, this.x));
    }

    normalize() {
        const l = this.length;
        this.x /= l;
        this.y /= l;
        return this;
    }

    equals(b) {
        return this.x == b.x && this.y == b.y;
    }

    add(b) {
        return new Vec2(this.x + b.x, this.y + b.y);
    }

    sub(b) {
        return new Vec2(this.x - b.x, this.y - b.y);
    }

    scale(b) {
        return new Vec2(this.x * b.x, this.y * b.y);
    }

    rotate(a) {
        const m = Matrix3.rotation(a);
        return m.transform(this);
    }

    multiply(s) {
        return new Vec2(this.x * s, this.y * s);
    }
}
