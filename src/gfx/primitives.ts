/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Containers for efficiently rendering sets of basic geometric primitives.
 *
 * The highest-level and easiest to use interface is PrimitiveSet, which
 * provides a "layer" of mixed primitives.
 *
 * The core principle here is primitive sets. These sets collect all the data
 * necessary to render *multiple* primitives. Primitive sets are write-once.
 * Call set() with a list of primitive objects to tesselate them and upload
 * their data to the GPU. Use draw() to have the GPU render the tesselated
 * geometry. Use dispose() to free GPU resources.
 *
 */

/**
 * Basic abstract geometric primitives that can be drawn using the Renderer
 * classes. These are dumb data structures- the actual code used to draw
 * them is implemented as part of the specific Renderer.
 */

import { Angle } from "../math/angle.js";
import { Vec2 } from "../math/vec2.js";
import { Color } from "./color.js";

/** A filled circle */
export class Circle {
    /**
     * Create a filled circle
     * @param center - center of circle
     * @param radius - circle radius
     * @param color - fill color
     */
    constructor(public center: Vec2, public radius: number, public color: Color) {}
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
        public color: Color
    ) {}
}

/** Stroked polyline */
export class Polyline {
    /**
     * Create a stroked polyline
     * @param points - line segment points
     * @param width - thickness of the rendered line
     * @param color - stroke color
     */
    constructor(public points: Vec2[], public width: number, public color: Color) {}
}

/** Filled polygon */
export class Polygon {
    vertices: Float32Array;

    /**
     * Create a filled polygon
     * @param points - point cloud representing the polygon
     * @param color - fill color
     */
    constructor(public points: Vec2[], public color: Color) {}
}
