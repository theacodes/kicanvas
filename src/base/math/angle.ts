/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "./vec2";

export type AngleLike = Angle | number;

/**
 * An angle for rotation and orientation
 */
export class Angle {
    #theta_rad: number;
    #theta_deg: number;

    /**
     * Convert radians to degrees
     */
    static rad_to_deg(radians: number) {
        return (radians / Math.PI) * 180;
    }

    /**
     * Convert degrees to radians
     */
    static deg_to_rad(degrees: number) {
        return (degrees / 180) * Math.PI;
    }

    /** Round degrees to two decimal places
     *
     * A lot of math involving angles is done with degrees to two decimal places
     * instead of radians to match KiCAD's behavior and to avoid floating point
     * nonsense.
     */
    static round(degrees: number): number {
        return Math.round((degrees + Number.EPSILON) * 100) / 100;
    }

    /**
     * Create an Angle
     */
    constructor(radians: AngleLike) {
        if (radians instanceof Angle) {
            return radians;
        }
        this.radians = radians;
    }

    copy() {
        return new Angle(this.radians);
    }

    get radians() {
        return this.#theta_rad;
    }

    set radians(v) {
        this.#theta_rad = v;
        this.#theta_deg = Angle.round(Angle.rad_to_deg(v));
    }

    get degrees() {
        return this.#theta_deg;
    }

    set degrees(v) {
        this.#theta_deg = v;
        this.#theta_rad = Angle.deg_to_rad(v);
    }

    static from_degrees(v: number) {
        return new Angle(Angle.deg_to_rad(v));
    }

    /**
     * Returns a new Angle representing the sum of this angle and the given angle.
     */
    add(other: AngleLike) {
        const sum = this.radians + new Angle(other).radians;
        return new Angle(sum);
    }

    /**
     * Returns a new Angle representing the different of this angle and the given angle.
     */
    sub(other: AngleLike) {
        const diff = this.radians - new Angle(other).radians;
        return new Angle(diff);
    }

    /**
     * @returns a new Angle constrained to 0 to 360 degrees.
     */
    normalize() {
        let deg = Angle.round(this.degrees);

        while (deg < 0) {
            deg += 360;
        }
        while (deg >= 360) {
            deg -= 360;
        }

        return Angle.from_degrees(deg);
    }

    /**
     * @returns a new Angle constrained to -180 to 180 degrees.
     */
    normalize180() {
        let deg = Angle.round(this.degrees);

        while (deg <= -180) {
            deg += 360;
        }
        while (deg > 180) {
            deg -= 360;
        }

        return Angle.from_degrees(deg);
    }

    /**
     * @returns a new Angle constrained to -360 to +360 degrees.
     */
    normalize720() {
        let deg = Angle.round(this.degrees);

        while (deg < -360) {
            deg += 360;
        }
        while (deg >= 360) {
            deg -= 360;
        }

        return Angle.from_degrees(deg);
    }

    /**
     * @returns a new Angle that's reflected in the other direction, for
     * example, 90 degrees ends up being -90 or 270 degrees (when normalized).
     */
    negative(): Angle {
        return new Angle(-this.radians);
    }

    get is_vertical() {
        return this.degrees == 90 || this.degrees == 270;
    }

    get is_horizontal() {
        return this.degrees == 0 || this.degrees == 180;
    }

    rotate_point(point: Vec2, origin: Vec2 = new Vec2(0, 0)): Vec2 {
        let x = point.x - origin.x;
        let y = point.y - origin.y;

        const angle = this.normalize();

        // shortcuts for 0, 90, 180, and 270
        if (angle.degrees == 0) {
            // do nothing
        } else if (angle.degrees == 90) {
            [x, y] = [y, -x];
        } else if (angle.degrees == 180) {
            [x, y] = [-x, -y];
        } else if (angle.degrees == 270) {
            [x, y] = [-y, x];
        }
        // no shortcut, do the actual math.
        else {
            const sina = Math.sin(angle.radians);
            const cosa = Math.cos(angle.radians);
            const [x0, y0] = [x, y];

            x = y0 * sina + x0 * cosa;
            y = y0 * cosa - x0 * sina;
        }

        x += origin.x;
        y += origin.y;

        return new Vec2(x, y);
    }
}
