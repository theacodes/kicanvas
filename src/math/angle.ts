/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

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

    /**
     * Returns a new Angle representing the sum of this angle and the given angle.
     */
    add(other: AngleLike) {
        const sum = this.radians + new Angle(other).radians;
        return new Angle(sum);
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

        const a = new Angle(0);
        a.degrees = deg;

        return a;
    }
}
