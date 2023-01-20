/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle } from "./angle.js";
import { Matrix3 } from "./matrix3.js";

/**
 * A 2-dimensional point vector
 *
 * All operations except for set() return new vectors and do not modify the existing vector
 */
export class Vec2 {
    x: number;
    y: number;

    /**
     * Create a Vec2
     * @param {number|Vec2} x_or_other
     * @param {number?} y
     */
    constructor(x_or_other = 0, y = null) {
        this.set(x_or_other, y);
    }

    /**
     * Copy this vector
     * @returns Vec2
     */
    copy() {
        return new Vec2(...this);
    }

    /**
     * Update this vector's values
     * @param {number|Vec2|*} x_or_other
     * @param {number?} y
     */
    set(x_or_other, y = null) {
        if (
            x_or_other instanceof this.constructor ||
            Object.hasOwn(x_or_other, "x")
        ) {
            this.x = x_or_other.x;
            this.y = x_or_other.y;
        } else {
            this.x = x_or_other;
            this.y = y;
        }
    }

    /** Iterate through [x, y] */
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }

    get magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    /**
     * @returns {Vec2} the perpendicular normal of this vector
     */
    get normal() {
        return new Vec2(-this.y, this.x);
    }

    /**
     * @returns {Angle} the direction (angle) of this vector
     */
    get angle() {
        return new Angle(Math.atan2(this.y, this.x));
    }

    /**
     * @returns {Vec2} a new unit vector in the same direction as this vector
     */
    normalize() {
        const l = this.magnitude;
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
