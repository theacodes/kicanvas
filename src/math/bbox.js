/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "./vec2.js";

export class BBox {
    constructor(x = 0, y = 0, w = 0, h = 0, context = undefined) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.context = context;
    }

    copy() {
        return new BBox(this.x, this.y, this.w, this.h, this.context);
    }

    static from_corners(x1, y1, x2, y2, context) {
        if (x2 < x1) {
            [x1, x2] = [x2, x1];
        }
        if (y2 < y1) {
            [y1, y2] = [y2, y1];
        }
        return new BBox(x1, y1, x2 - x1, y2 - y1, context);
    }

    static from_points(points, context) {
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

    static combine(boxes, context) {
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

    transform(mat) {
        // TODO: Make this use Matrix3
        const p1 = mat.transformPoint(new DOMPoint(this.x, this.y));
        const p2 = mat.transformPoint(new DOMPoint(this.x2, this.y2));
        this.x = p1.x;
        this.y = p1.y;
        this.x2 = p2.x;
        this.y2 = p2.y;
        return this;
    }

    grow(v) {
        this.x -= v;
        this.y -= v;
        this.w += v * 2;
        this.h += v * 2;
        return this;
    }

    contains_point(v) {
        return (
            v.x >= this.x && v.x <= this.x2 && v.y >= this.y && v.y <= this.y2
        );
    }
}
