/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * An angle for rotation and orientation
 */
export class Angle {
    /**
     * Convert radians to degrees
     * @param {number} radians
     * @returns {number} degrees
     */
    static rad_to_deg(radians) {
        return (radians / Math.PI) * 180;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees
     * @returns {number} radians
     */
    static deg_to_rad(degrees) {
        return (degrees / 180) * Math.PI;
    }

    /** Round degrees to two decimal places
     *
     * A lot of math involving angles is done with degrees to two decimal places
     * instead of radians to match KiCAD's behavior and to avoid floating point
     * nonsense.
     *
     * @param {*} degrees
     * @returns
     */
    static round(degrees) {
        return Math.round((degrees + Number.EPSILON) * 100) / 100;
    }

    /**
     * Create an Angle
     * @param {number|Angle} radians
     */
    constructor(radians) {
        if (radians instanceof Angle) {
            return radians;
        }
        this.radians = radians;
    }

    get radians() {
        return this.theta_rad;
    }

    set radians(v) {
        this.theta_rad = v;
        this.theta_deg = Angle.round(Angle.rad_to_deg(v));
    }

    get degrees() {
        return this.theta_deg;
    }

    set degrees(v) {
        this.theta_deg = v;
        this.theta_rad = Angle.deg_to_rad(v);
    }

    /**
     * Returns a new Angle representing the sum of this angle and the given angle.
     * @param {Angle|number} other
     * @returns {Angle}
     */
    add(other) {
        const sum = this.radians + new Angle(other).radians;
        return new Angle(sum);
    }

    /**
     * @returns {Angle} a new Angle constrained to 0 to 360 degrees.
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
