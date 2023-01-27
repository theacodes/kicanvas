/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle } from "./angle";
import { Vec2 } from "./vec2";

/**
 * A circular arc
 */
export class Arc {
    /**
     * Create a new Arc
     */
    constructor(
        public center: Vec2,
        public radius: number,
        public start_angle: Angle,
        public end_angle: Angle,
        public width: number
    ) {}

    /**
     * Create an Arc given three points on a circle
     */
    static from_three_points(start: Vec2, mid: Vec2, end: Vec2, width = 1) {
        const u = 1000000;
        const center = arc_center_from_three_points(
            new Vec2(start.x * u, start.y * u),
            new Vec2(mid.x * u, mid.y * u),
            new Vec2(end.x * u, end.y * u)
        );
        center.x /= u;
        center.y /= u;
        const radius = center.sub(mid).magnitude;
        const start_radial = start.sub(center);
        const mid_radial = mid.sub(center);
        const end_radial = end.sub(center);
        let start_angle = start_radial.angle.normalize();
        const mid_angle = mid_radial.angle.normalize();
        let end_angle = end_radial.angle.normalize();

        if (start_angle.degrees > mid_angle.degrees) {
            start_angle.degrees -= 360;
        }

        if (start_angle.degrees > end_angle.degrees) {
            [start_angle, end_angle] = [end_angle, start_angle];
        }

        if (end_angle.degrees < mid_angle.degrees) {
            [start_angle, end_angle] = [end_angle, start_angle];
            end_angle.degrees += 360;
        }

        return new Arc(center, radius, start_angle, end_angle, width);
    }

    /**
     * Approximate the Arc using a polyline
     */
    to_polyline(): Vec2[] {
        const start = this.start_angle.radians;
        const end = this.end_angle.radians;
        const points = [];

        if (start > end) {
            throw new Error(
                `Invalid arc, starts at ${start} and ends at ${end}`
            );
        }

        // TODO: Pull KiCAD's logic for this, since it adds more segments the
        // larger the arc is.
        for (let theta = start; theta < end; theta += Math.PI / 32) {
            points.push(
                new Vec2(
                    this.center.x + Math.cos(theta) * this.radius,
                    this.center.y + Math.sin(theta) * this.radius
                )
            );
        }

        // Add the last point if needed.
        const last_point = new Vec2(
            this.center.x + Math.cos(end) * this.radius,
            this.center.y + Math.sin(end) * this.radius
        );

        if (!last_point.equals(points[points.length - 1])) {
            points.push(last_point);
        }

        return points;
    }
}

/**
 * Figure out the center point of a circular arc given three points along the circle.
 *
 * Ported from KiCAD's KiMATH trigo
 */
function arc_center_from_three_points(start: Vec2, mid: Vec2, end: Vec2): Vec2 {
    const sqrt_1_2 = Math.SQRT1_2;
    const center = new Vec2(0, 0);
    const y_delta_21 = mid.y - start.y;
    let x_delta_21 = mid.x - start.x;
    const y_delta_32 = end.y - mid.y;
    let x_delta_32 = end.x - mid.x;

    // This is a special case for mid as the half-way point when aSlope = 0 and bSlope = inf
    // or the other way around.  In that case, the center lies in a straight line between
    // start and end
    if (
        (x_delta_21 == 0.0 && y_delta_32 == 0.0) ||
        (y_delta_21 == 0.0 && x_delta_32 == 0.0)
    ) {
        center.x = (start.x + end.x) / 2.0;
        center.y = (start.y + end.y) / 2.0;
        return center;
    }

    // Prevent div=0 errors
    if (x_delta_21 == 0.0) {
        x_delta_21 = Number.EPSILON;
    }

    if (x_delta_32 == 0.0) x_delta_32 = -Number.EPSILON;

    let slope_a = y_delta_21 / x_delta_21;
    let slope_b = y_delta_32 / x_delta_32;

    const d_slope_a =
        slope_a * new Vec2(0.5 / y_delta_21, 0.5 / x_delta_21).magnitude;
    const d_slope_b =
        slope_b * new Vec2(0.5 / y_delta_32, 0.5 / x_delta_32).magnitude;

    if (slope_a == slope_b) {
        if (start == end) {
            // This is a special case for a 360 degrees arc.  In this case, the center is halfway between
            // the midpoint and either end point
            center.x = (start.x + mid.x) / 2.0;
            center.y = (start.y + mid.y) / 2.0;
            return center;
        } else {
            // If the points are colinear, the center is at infinity, so offset
            // the slope by a minimal amount
            // Warning: This will induce a small error in the center location
            slope_a += Number.EPSILON;
            slope_b -= Number.EPSILON;
        }
    }

    // Prevent divide by zero error
    if (slope_a == 0.0) {
        slope_a = Number.EPSILON;
    }

    // What follows is the calculation of the center using the slope of the two lines as well as
    // the propagated error that occurs when rounding to the nearest nanometer.  The error can be
    // ±0.5 units but can add up to multiple nanometers after the full calculation is performed.
    // All variables starting with `d` are the delta of that variable.  This is approximately equal
    // to the standard deviation.
    // We ignore the possible covariance between variables.  We also truncate our series expansion
    // at the first term.  These are reasonable assumptions as the worst-case scenario is that we
    // underestimate the potential uncertainty, which would potentially put us back at the status quo
    const slope_ab_start_end_y = slope_a * slope_b * (start.y - end.y);
    const d_slope_ab_start_end_y =
        slope_ab_start_end_y *
        Math.sqrt(
            ((d_slope_a / slope_a) * d_slope_a) / slope_a +
                ((d_slope_b / slope_b) * d_slope_b) / slope_b +
                (sqrt_1_2 / (start.y - end.y)) * (sqrt_1_2 / (start.y - end.y))
        );

    const slope_b_start_mid_x = slope_b * (start.x + mid.x);
    const d_slope_b_start_mid_x =
        slope_b_start_mid_x *
        Math.sqrt(
            ((d_slope_b / slope_b) * d_slope_b) / slope_b +
                ((sqrt_1_2 / (start.x + mid.x)) * sqrt_1_2) / (start.x + mid.x)
        );

    const slope_a_mid_end_x = slope_a * (mid.x + end.x);
    const d_slope_a_mid_end_x =
        slope_a_mid_end_x *
        Math.sqrt(
            ((d_slope_a / slope_a) * d_slope_a) / slope_a +
                ((sqrt_1_2 / (mid.x + end.x)) * sqrt_1_2) / (mid.x + end.x)
        );

    const twice_b_a_slope_diff = 2 * (slope_b - slope_a);
    const d_twice_b_a_slope_diff =
        2 * Math.sqrt(d_slope_b * d_slope_b + d_slope_a * d_slope_a);

    const center_numerator_x =
        slope_ab_start_end_y + slope_b_start_mid_x - slope_a_mid_end_x;
    const d_center_numerator_x = Math.sqrt(
        d_slope_ab_start_end_y * d_slope_ab_start_end_y +
            d_slope_b_start_mid_x * d_slope_b_start_mid_x +
            d_slope_a_mid_end_x * d_slope_a_mid_end_x
    );

    const center_x =
        (slope_ab_start_end_y + slope_b_start_mid_x - slope_a_mid_end_x) /
        twice_b_a_slope_diff;

    const d_center_x =
        center_x *
        Math.sqrt(
            ((d_center_numerator_x / center_numerator_x) *
                d_center_numerator_x) /
                center_numerator_x +
                ((d_twice_b_a_slope_diff / twice_b_a_slope_diff) *
                    d_twice_b_a_slope_diff) /
                    twice_b_a_slope_diff
        );

    const center_numerator_y = (start.x + mid.x) / 2.0 - center_x;
    const d_center_numerator_y = Math.sqrt(1.0 / 8.0 + d_center_x * d_center_x);

    const center_first_term = center_numerator_y / slope_a;
    const d_center_first_term_y =
        center_first_term *
        Math.sqrt(
            ((d_center_numerator_y / center_numerator_y) *
                d_center_numerator_y) /
                center_numerator_y +
                ((d_slope_a / slope_a) * d_slope_a) / slope_a
        );

    const center_y = center_first_term + (start.y + mid.y) / 2.0;
    const d_center_y = Math.sqrt(
        d_center_first_term_y * d_center_first_term_y + 1.0 / 8.0
    );

    const rounded_100_center_x = Math.floor((center_x + 50.0) / 100.0) * 100.0;
    const rounded_100_center_y = Math.floor((center_y + 50.0) / 100.0) * 100.0;
    const rounded_10_center_x = Math.floor((center_x + 5.0) / 10.0) * 10.0;
    const rounded_10_center_y = Math.floor((center_y + 5.0) / 10.0) * 10.0;

    // The last step is to find the nice, round numbers near our baseline estimate and see if they are within our uncertainty
    // range  If they are, then we use this round value as the true value.  This is justified because ALL values within the
    // uncertainty range are equally true. Using a round number will make sure that we are on a multiple of 1mil or 100nm
    // when calculating centers.
    if (
        Math.abs(rounded_100_center_x - center_x) < d_center_x &&
        Math.abs(rounded_100_center_y - center_y) < d_center_y
    ) {
        center.x = rounded_100_center_x;
        center.y = rounded_100_center_y;
    } else if (
        Math.abs(rounded_10_center_x - center_x) < d_center_x &&
        Math.abs(rounded_10_center_y - center_y) < d_center_y
    ) {
        center.x = rounded_10_center_x;
        center.y = rounded_10_center_y;
    } else {
        center.x = center_x;
        center.y = center_y;
    }

    return center;
}
