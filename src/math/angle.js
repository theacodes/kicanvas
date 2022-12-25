/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class Angle {
    static rad_to_deg(radians) {
        return (radians / Math.PI) * 180;
    }

    static deg_to_rad(degress) {
        return (degress / 180) * Math.PI;
    }

    // A lot of math involving angles is done with degrees to two decimal places
    // instead of radians to match KiCAD's behavior and to avoid floating point
    // nonsense.
    static round(degrees) {
        return Math.round((degrees + Number.EPSILON) * 100) / 100;
    }

    constructor(radians) {
        this.radians = radians;
    }

    get radians() {
        return this.theta_rad;
    }

    set radians(v) {
        this.theta_rad = v;
        this.theta_deg = this.constructor.round(this.constructor.rad_to_deg(v));
    }

    get degrees() {
        return this.theta_deg;
    }

    set degrees(v) {
        this.theta_deg = v;
        this.theta_rad = this.constructor.deg_to_rad(v);
    }

    normalize() {
        let deg = this.constructor.round(this.degrees);
        while (deg < 0) {
            deg += 360;
        }
        while (deg >= 360) {
            deg -= 360;
        }
        this.degrees = this.constructor.round(deg);

        return this;
    }
}
