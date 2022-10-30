export class BBox {
    constructor(
        x = 0,
        y = 0,
        w = 0,
        h = 0,
        mat = undefined,
        context = undefined
    ) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        if (mat) {
            this.transform(mat);
        }

        this.context = context;
    }

    static from_points(x1, y1, x2, y2, mat, context) {
        return new BBox(x1, y1, x2 - x1, y2 - y1, mat, context);
    }

    static combine(r1, r2, context) {
        if (!r1.valid) {
            return new BBox(r2.x, r2.y, r2.w, r2.h, null, context);
        }
        if (!r2.valid) {
            return new BBox(r1.x, r1.y, r1.w, r1.h, null, context);
        }

        const x = Math.min(r1.x, r2.x);
        const y = Math.min(r1.y, r2.y);
        const x2 = Math.max(r1.x2, r2.x2);
        const y2 = Math.max(r1.y2, r2.y2);

        return BBox.from_points(x, y, x2, y2, null, context);
    }

    get valid() {
        return this.w !== 0 || this.h !== 0;
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
        const p1 = mat.transformPoint(new DOMPoint(this.x, this.y));
        const p2 = mat.transformPoint(new DOMPoint(this.x2, this.y2));
        this.x = p1.x;
        this.y = p1.y;
        this.x2 = p2.x;
        this.y2 = p2.y;
    }

    contains_point(x, y) {
        return (x >= this.x && x <= this.x2 && y >= this.y && y <= this.y2);
    }
}
