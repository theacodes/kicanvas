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

import { Vec2 } from "../math/vec2.js";
import { Color } from "./color.js";

/** Circle primitive data */
export class Circle {
    /**
     * Create a filled circle
     */
    constructor(public point: Vec2, public radius: number, public color: Color) {}
}

/** Polyline primitive data */
export class Polyline {
    /**
     * Create a stroked polyline
     * @param points - line segment points
     * @param width - thickness of the rendered line
     */
    constructor(public points: Vec2[], public width: number, public color: Color) {}
}

/** Polygon primitive data */
export class Polygon {
    vertices: Float32Array;

    /**
     * Create a filled polygon
     * @param points - point cloud representing the polygon
     */
    constructor(public points: Vec2[], public color: Color) {}
}
