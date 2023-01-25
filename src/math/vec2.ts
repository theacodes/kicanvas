/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, AngleLike } from "./angle.js";
import { Matrix3 } from "./matrix3.js";

export type Vec2Like =
    | Vec2
    | { x: number; y: number }
    | [number, number]
    | number;

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
     */
    constructor(x: Vec2Like = 0, y: number | null = null) {
        this.set(x, y);
    }

    /**
     * Copy this vector
     */
    copy() {
        return new Vec2(...this);
    }

    /**
     * Update this vector's values
     */
    set(x: Vec2Like, y: number = null) {
        let x_prime: number;

        if (typeof x == "number" && typeof y == "number") {
            x_prime = x;
        } else if (x instanceof Vec2) {
            x_prime = x.x;
            y = x.y;
        } else if (x instanceof Array) {
            x_prime = x[0];
            y = x[1];
        } else if (x instanceof Object && Object.hasOwn(x, "x")) {
            this.x = x.x;
            this.y = x.y;
        }

        this.x = x_prime;
        this.y = y;
    }

    /** Iterate through [x, y] */
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }

    get magnitude(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    /**
     * @returns the perpendicular normal of this vector
     */
    get normal(): Vec2 {
        return new Vec2(-this.y, this.x);
    }

    /**
     * @returns the direction (angle) of this vector
     */
    get angle(): Angle {
        return new Angle(Math.atan2(this.y, this.x));
    }

    /**
     * @returns A new unit vector in the same direction as this vector
     */
    normalize(): Vec2 {
        const l = this.magnitude;
        const x = (this.x /= l);
        const y = (this.y /= l);
        return new Vec2(x, y);
    }

    equals(b: Vec2) {
        return this.x == b.x && this.y == b.y;
    }

    add(b: Vec2) {
        return new Vec2(this.x + b.x, this.y + b.y);
    }

    sub(b: Vec2) {
        return new Vec2(this.x - b.x, this.y - b.y);
    }

    scale(b: Vec2) {
        return new Vec2(this.x * b.x, this.y * b.y);
    }

    rotate(angle: AngleLike) {
        const m = Matrix3.rotation(angle);
        return m.transform(this);
    }

    multiply(s: number) {
        return new Vec2(this.x * s, this.y * s);
    }
}
