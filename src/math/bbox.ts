/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Matrix3 } from "./matrix3";
import { Vec2 } from "./vec2";

/**
 * An axis-alignment bounding box (AABB)
 */
export class BBox {
    /**
     * Create a bounding box
     */
    constructor(
        public x: number = 0,
        public y: number = 0,
        public w: number = 0,
        public h: number = 0,
        public context?: any,
    ) {}

    copy() {
        return new BBox(this.x, this.y, this.w, this.h, this.context);
    }

    /**
     * Create a BBox given the top left and bottom right corners
     */
    static from_corners(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        context?: any,
    ) {
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
     */
    static from_points(points: Vec2[], context?: any) {
        if (points.length == 0) {
            return new BBox(0, 0, 0, 0);
        }

        const first_pt = points[0]!;
        const start = first_pt.copy();
        const end = first_pt.copy();

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
     */
    static combine(boxes: Iterable<BBox>, context?: any) {
        let min_x = Number.POSITIVE_INFINITY;
        let min_y = Number.POSITIVE_INFINITY;
        let max_x = Number.NEGATIVE_INFINITY;
        let max_y = Number.NEGATIVE_INFINITY;

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
            min_x == Number.POSITIVE_INFINITY ||
            min_y == Number.POSITIVE_INFINITY ||
            max_x == Number.NEGATIVE_INFINITY ||
            max_y == Number.NEGATIVE_INFINITY
        ) {
            return new BBox(0, 0, 0, 0, context);
        }

        return BBox.from_corners(min_x, min_y, max_x, max_y, context);
    }

    /**
     * @returns true if the bbox has a non-zero area
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

    set x2(v: number) {
        if (v < this.x) {
            [v, this.x] = [this.x, v];
        }
        this.w = v - this.x;
    }

    get y2() {
        return this.y + this.h;
    }

    set y2(v: number) {
        if (v < this.y) {
            [v, this.y] = [this.y, v];
        }
        this.h = v - this.y;
    }

    get center() {
        return new Vec2(this.x + this.w / 2, this.y + this.h / 2);
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
     * @returns A new BBox with the size uniformly modified from the center
     */
    grow(s: number) {
        return new BBox(
            this.x - s,
            this.y - s,
            this.w + s * 2,
            this.h + s * 2,
            this.context,
        );
    }

    /**
     * @returns true if the point is within the bounding box.
     */
    contains_point(v: Vec2) {
        return (
            v.x >= this.x && v.x <= this.x2 && v.y >= this.y && v.y <= this.y2
        );
    }

    /**
     * @returns A new Vec2 constrained within this bounding box
     */
    constrain_point(v: Vec2): Vec2 {
        const x = Math.min(Math.max(v.x, this.x), this.x2);
        const y = Math.min(Math.max(v.y, this.y), this.y2);
        return new Vec2(x, y);
    }
}
