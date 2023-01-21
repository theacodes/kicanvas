/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Matrix3 } from "./matrix3";
import { Vec2 } from "./vec2";

class Transform {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public rotation: number = 0,
        public flip_x: boolean = false,
        public flip_y: boolean = false) { }

    copy() {
        return new Transform(
            this.x,
            this.y,
            this.rotation,
            this.flip_x,
            this.flip_y
        );
    }

    apply(ctx) {
        ctx.translate(this.x, this.y);
        ctx.scale(this.flip_x ? -1 : 1, this.flip_y ? -1 : 1);
        ctx.rotate((this.rotation * Math.PI) / 180);
    }

    transform_point(x, y) {
        const p = this.mat.transform(new Vec2(x, y));
        return { x: p.x, y: p.y };
    }

    normalize_rotation() {
        while (this.rotation > 360) {
            this.rotation -= 360;
        }
        while (this.rotation < 0) {
            this.rotation += 360;
        }
    }

    get mat() {
        const mat = Matrix3.identity();
        mat.translate_self(this.x, this.y);
        mat.scale_self(this.flip_x ? -1 : 1, this.flip_y ? -1 : 1);
        mat.rotate_self(this.rotation);
        return mat;
    }
}

export class TransformStack {
    ctx: CanvasRenderingContext2D;
    base_matrix: Matrix3;
    t_stack: Transform[] = [];
    m_stack: Matrix3[] = [];

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.base_matrix = Matrix3.from_DOMMatrix(ctx.getTransform());
    }

    push(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        const tx = new Transform(x, y, rotation, flip_x, flip_y);
        this.m_stack.push(Matrix3.from_DOMMatrix(this.ctx.getTransform()));
        this.t_stack.push(tx);
        tx.apply(this.ctx);
    }

    pop() {
        this.t_stack.pop();
        this.ctx.setTransform(this.m_stack.pop().to_DOMMatrix());
    }

    get abs() {
        if (this.t_stack.length == 0) {
            return new Transform();
        }
        const atx = this.t_stack[0].copy();
        for (const tx of this.t_stack.slice(1)) {
            atx.rotation += tx.rotation;
            if (tx.flip_x) {
                atx.flip_x = !atx.flip_x;
            }
            if (tx.flip_y) {
                atx.flip_y = !atx.flip_y;
            }
        }
        return atx;
    }

    get mat() {
        const mat = Matrix3.identity();
        for (const tx of this.t_stack) {
            mat.multiply_self(tx.mat);
        }
        return mat;
    }
}
