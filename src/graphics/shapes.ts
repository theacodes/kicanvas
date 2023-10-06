/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Basic abstract geometric primitives that can be drawn using the Renderer
 * classes. These are dumb data structures- the actual code used to draw
 * them is implemented as part of the specific Renderer.
 */

import { Angle, BBox, Vec2 } from "../base/math";
import { Color } from "../base/color";

type OptionalDefaultColor = Color | false | null;

/** A filled circle */
export class Circle {
    /**
     * Create a filled circle
     * @param center - center of circle
     * @param radius - circle radius
     * @param color - fill color
     */
    constructor(
        public center: Vec2,
        public radius: number,
        public color: OptionalDefaultColor,
    ) {}
}

/** A stroked circular arc */
export class Arc {
    /**
     * Create a stroked arc
     * @param center - center of arc circle
     * @param radius - arc circle radius
     * @param start_angle - arc start angle
     * @param end_angle - arc end angle
     * @param color - stroke color
     */
    constructor(
        public center: Vec2,
        public radius: number,
        public start_angle: Angle,
        public end_angle: Angle,
        public width: number,
        public color: OptionalDefaultColor,
    ) {}
}

/** Stroked polyline */
export class Polyline {
    /**
     * Create a stroked polyline
     * @param points - line segment points
     * @param width - thickness of the rendered lines
     * @param color - stroke color
     */
    constructor(
        public points: Vec2[],
        public width: number,
        public color: OptionalDefaultColor,
    ) {}

    /**
     * Create a rectangular outline from a bounding box.
     * @param bb
     * @param width - thickness of the rendered lines
     * @param color - fill color
     */
    static from_BBox(bb: BBox, width: number, color: Color) {
        return new Polyline(
            [
                bb.top_left,
                bb.top_right,
                bb.bottom_right,
                bb.bottom_left,
                bb.top_left,
            ],
            width,
            color,
        );
    }
}

/** Filled polygon */
export class Polygon {
    vertices: Float32Array;

    /**
     * Create a filled polygon
     * @param points - point cloud representing the polygon
     * @param color - fill color
     */
    constructor(
        public points: Vec2[],
        public color: OptionalDefaultColor,
    ) {}

    /**
     * Create a filled polygon from a bounding box.
     * @param bb
     * @param color - fill color
     */
    static from_BBox(bb: BBox, color: Color) {
        return new Polygon(
            [bb.top_left, bb.top_right, bb.bottom_right, bb.bottom_left],
            color,
        );
    }
}

export type Shape = Circle | Arc | Polygon | Polyline;
