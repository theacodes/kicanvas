/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { is_number } from "../types";
import { Angle, type AngleLike } from "./angle";
import { Matrix3 } from "./matrix3";

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
    constructor(x: Vec2Like = 0, y?: number) {
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
    set(x: Vec2Like, y?: number) {
        let x_prime: number | null = null;

        if (is_number(x) && is_number(y)) {
            x_prime = x;
        } else if (x instanceof Vec2) {
            x_prime = x.x;
            y = x.y;
        } else if (x instanceof Array) {
            x_prime = x[0];
            y = x[1];
        } else if (x instanceof Object && Object.hasOwn(x, "x")) {
            x_prime = x.x;
            y = x.y;
        } else if (x == 0 && y == undefined) {
            x_prime = 0;
            y = 0;
        }

        if (x_prime == null || y == undefined) {
            throw new Error(`Invalid parameters x: ${x}, y: ${y}.`);
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

    get squared_magnitude(): number {
        return this.x ** 2 + this.y ** 2;
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
     * KiCAD has to be weird about this, ofc.
     */
    get kicad_angle(): Angle {
        // See explicit EDA_ANGLE( const VECTOR2D& aVector )
        if (this.x == 0 && this.y == 0) {
            return new Angle(0);
        } else if (this.y == 0) {
            if (this.x >= 0) {
                return new Angle(0);
            } else {
                return Angle.from_degrees(-180);
            }
        } else if (this.x == 0) {
            if (this.y >= 0) {
                return Angle.from_degrees(90);
            } else {
                return Angle.from_degrees(-90);
            }
        } else if (this.x == this.y) {
            if (this.x >= 0) {
                return Angle.from_degrees(45);
            } else {
                return Angle.from_degrees(-135);
            }
        } else if (this.x == -this.y) {
            if (this.x >= 0) {
                return Angle.from_degrees(-45);
            } else {
                return Angle.from_degrees(135);
            }
        } else {
            return this.angle;
        }
    }

    /**
     * @returns A new unit vector in the same direction as this vector
     */
    normalize(): Vec2 {
        if (this.x == 0 && this.y == 0) {
            return new Vec2(0, 0);
        }
        const l = this.magnitude;
        const x = (this.x /= l);
        const y = (this.y /= l);
        return new Vec2(x, y);
    }

    equals(b?: Vec2) {
        return this.x == b?.x && this.y == b?.y;
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

    multiply(s: Vec2 | number) {
        if (is_number(s)) {
            return new Vec2(this.x * s, this.y * s);
        } else {
            return new Vec2(this.x * s.x, this.y * s.y);
        }
    }

    resize(len: number) {
        return this.normalize().multiply(len);
    }

    cross(b: Vec2) {
        return this.x * b.y - this.y * b.x;
    }

    static segment_intersect(a1: Vec2, b1: Vec2, a2: Vec2, b2: Vec2) {
        const ray_1 = b1.sub(a1);
        const ray_2 = b2.sub(a2);
        const delta = a2.sub(a1);

        const d = ray_2.cross(ray_1);
        const t1 = ray_2.cross(delta);
        const t2 = ray_1.cross(delta);

        if (d == 0) {
            return null;
        }

        if (d > 0 && (t2 < 0 || t2 > d || t1 < 0 || t1 > d)) {
            return null;
        }

        if (d < 0 && (t2 < d || t1 < d || t1 > 0 || t2 > 0)) {
            return null;
        }

        return new Vec2(a2.x + (t2 / d) * ray_2.x, a2.y + (t2 / d) * ray_2.y);
    }
}
