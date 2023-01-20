/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Matrix3 } from "./matrix3.js";
import { Vec2 } from "./vec2.js";

/**
 * An axis-alignment bounding box (AABB)
 */
export class BBox {
    x: number;
    y: number;
    w: number;
    h: number;
    context: any;

    /**
     * Create a bounding box
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {*?} context
     */
    constructor(x = 0, y = 0, w = 0, h = 0, context = null) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.context = context;
    }

    /**
     * @returns {BBox}
     */
    copy() {
        return new BBox(this.x, this.y, this.w, this.h, this.context);
    }

    /**
     * Create a BBox given the top left and bottom right corners
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {*?} context
     * @returns {BBox}
     */
    static from_corners(x1, y1, x2, y2, context = null) {
        if (x2 < x1) {
            [x1, x2] = [x2, x1];
        }
        if (y2 < y1) {
            [y1, y2] = [y2, y1];
        }
        return new BBox(x1, y1, x2 - x1, y2 - y1, context);
    }

    /**
     * Create a BBox that contains all the given points
     * @param {Array.<Vec2>} points
     * @param {*?} context
     * @returns {BBox}
     */
    static from_points(points, context = null) {
        const start = points[0].copy();
        const end = points[0].copy();

        for (const p of points) {
            start.x = Math.min(start.x, p.x);
            start.y = Math.min(start.y, p.y);
            end.x = Math.max(end.x, p.x);
            end.y = Math.max(end.y, p.y);
        }

        return BBox.from_corners(start.x, start.y, end.x, end.y, context);
    }

    /**
     * Combine two or more BBoxes into a new BBox that contains both
     * @param {IterableIterator.<BBox>} boxes
     * @param {*?} context
     * @returns {BBox}
     */
    static combine(boxes, context = null) {
        let min_x = Number.MAX_VALUE;
        let min_y = Number.MAX_VALUE;
        let max_x = Number.MIN_VALUE;
        let max_y = Number.MIN_VALUE;

        for (const box of boxes) {
            if (!box.valid) {
                continue;
            }

            min_x = Math.min(min_x, box.x);
            min_y = Math.min(min_y, box.y);
            max_x = Math.max(max_x, box.x2);
            max_y = Math.max(max_y, box.y2);
        }

        if (
            min_x == Number.MAX_VALUE ||
            min_y == Number.MAX_VALUE ||
            max_x == Number.MIN_VALUE ||
            max_y == Number.MIN_VALUE
        ) {
            return new BBox(0, 0, 0, 0, context);
        }

        return BBox.from_corners(min_x, min_y, max_x, max_y, context);
    }

    /**
     * @returns {boolean} true if the bbox has a non-zero area
     */
    get valid() {
        return (
            (this.w !== 0 || this.h !== 0) &&
            this.w !== undefined &&
            this.h !== undefined
        );
    }

    get start() {
        return new Vec2(this.x, this.y);
    }

    get end() {
        return new Vec2(this.x + this.w, this.y + this.h);
    }

    get top_left() {
        return this.start;
    }

    get top_right() {
        return new Vec2(this.x + this.w, this.y);
    }

    get bottom_left() {
        return new Vec2(this.x, this.y + this.h);
    }

    get bottom_right() {
        return this.end;
    }

    get x2() {
        return this.x + this.w;
    }

    set x2(v) {
        if (v < this.x) {
            [v, this.x] = [this.x, v];
        }
        this.w = v - this.x;
    }

    get y2() {
        return this.y + this.h;
    }

    set y2(v) {
        if (v < this.y) {
            [v, this.y] = [this.y, v];
        }
        this.h = v - this.y;
    }

    /**
     * @returns A new BBox transformed by the given matrix.
     */
    transform(mat: Matrix3) {
        const start = mat.transform(this.start);
        const end = mat.transform(this.end);
        return BBox.from_corners(start.x, start.y, end.x, end.y, this.context);
    }

    /**
     * @param {number} s
     * @returns A new BBox with the size uniformly modified from the center
     */
    grow(s) {
        return new BBox(
            this.x - s,
            this.y - s,
            this.w + s * 2,
            this.h + s * 2,
            this.context
        );
    }

    /**
     * @param {Vec2} v
     * @returns {boolean} true if the point is within the bounding box.
     */
    contains_point(v) {
        return (
            v.x >= this.x && v.x <= this.x2 && v.y >= this.y && v.y <= this.y2
        );
    }

    /**
     * @param {Vec2} v
     * @returns {Vec2} A new Vec2 constrained within this bounding box
     */
    constrain_point(v) {
        const x = Math.min(Math.max(v.x, this.x), this.x2);
        const y = Math.min(Math.max(v.y, this.y), this.y2);
        return new Vec2(x, y);
    }
}
