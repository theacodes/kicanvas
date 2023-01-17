/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "./vec2.js";
import { Angle } from "./angle.js";

export class Matrix3 {
    constructor(elements) {
        this.elements = new Float32Array(elements);
    }

    static from_DOMMatrix(m) {
        // prettier-ignore
        return new Matrix3([
            m.m11, m.m12, m.m14,
            m.m21, m.m22, m.m24,
            m.m41, m.m42, m.m44,
        ]);
    }

    to_DOMMatrix() {
        const e = this.elements;
        // prettier-ignore
        return new DOMMatrix([
            e[0], e[3],
            e[1], e[4],
            e[6], e[7],
        ]);
    }

    to_4x4_DOMMatrix() {
        const e = this.elements;
        // prettier-ignore
        return new DOMMatrix([
            e[0], e[1],  0, e[2],
            e[3], e[4],  0, e[5],
            0,    0,     1, 0,
            e[6], e[7],  0, 1
        ]);
    }

    static identity() {
        // prettier-ignore
        return new Matrix3([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
        ]);
    }

    static orthographic(width, height) {
        // prettier-ignore
        return new Matrix3([
            2 / width   ,              0,      0,
            0           , -2 / height   ,      0,
            -1          , 1             ,      1
        ]);
    }

    copy() {
        return new Matrix3(this.elements);
    }

    set(elements) {
        this.elements.set(elements);
    }

    transform(vec) {
        const a00 = this.elements[0 * 3 + 0];
        const a01 = this.elements[0 * 3 + 1];
        const a10 = this.elements[1 * 3 + 0];
        const a11 = this.elements[1 * 3 + 1];
        const a20 = this.elements[2 * 3 + 0];
        const a21 = this.elements[2 * 3 + 1];
        const b00 = vec.x;
        const b01 = vec.y;
        const b02 = 1;

        const x = b00 * a00 + b01 * a10 + b02 * a20;
        const y = b00 * a01 + b01 * a11 + b02 * a21;

        return new Vec2(x, y);
    }

    *transform_all(vecs) {
        for (const vec of vecs) {
            yield this.transform(vec);
        }
    }

    static transform_all(mat, vecs) {
        if (!mat) {
            return vecs;
        }
        return Array.from(mat.transform_all(vecs));
    }

    multiply(b) {
        const a00 = this.elements[0 * 3 + 0];
        const a01 = this.elements[0 * 3 + 1];
        const a02 = this.elements[0 * 3 + 2];
        const a10 = this.elements[1 * 3 + 0];
        const a11 = this.elements[1 * 3 + 1];
        const a12 = this.elements[1 * 3 + 2];
        const a20 = this.elements[2 * 3 + 0];
        const a21 = this.elements[2 * 3 + 1];
        const a22 = this.elements[2 * 3 + 2];
        const b00 = b.elements[0 * 3 + 0];
        const b01 = b.elements[0 * 3 + 1];
        const b02 = b.elements[0 * 3 + 2];
        const b10 = b.elements[1 * 3 + 0];
        const b11 = b.elements[1 * 3 + 1];
        const b12 = b.elements[1 * 3 + 2];
        const b20 = b.elements[2 * 3 + 0];
        const b21 = b.elements[2 * 3 + 1];
        const b22 = b.elements[2 * 3 + 2];

        this.elements[0] = b00 * a00 + b01 * a10 + b02 * a20;
        this.elements[1] = b00 * a01 + b01 * a11 + b02 * a21;
        this.elements[2] = b00 * a02 + b01 * a12 + b02 * a22;
        this.elements[3] = b10 * a00 + b11 * a10 + b12 * a20;
        this.elements[4] = b10 * a01 + b11 * a11 + b12 * a21;
        this.elements[5] = b10 * a02 + b11 * a12 + b12 * a22;
        this.elements[6] = b20 * a00 + b21 * a10 + b22 * a20;
        this.elements[7] = b20 * a01 + b21 * a11 + b22 * a21;
        this.elements[8] = b20 * a02 + b21 * a12 + b22 * a22;

        return this;
    }

    inverse() {
        const a00 = this.elements[0 * 3 + 0];
        const a01 = this.elements[0 * 3 + 1];
        const a02 = this.elements[0 * 3 + 2];
        const a10 = this.elements[1 * 3 + 0];
        const a11 = this.elements[1 * 3 + 1];
        const a12 = this.elements[1 * 3 + 2];
        const a20 = this.elements[2 * 3 + 0];
        const a21 = this.elements[2 * 3 + 1];
        const a22 = this.elements[2 * 3 + 2];

        const b01 = a22 * a11 - a12 * a21;
        const b11 = -a22 * a10 + a12 * a20;
        const b21 = a21 * a10 - a11 * a20;

        const det = a00 * b01 + a01 * b11 + a02 * b21;
        const inv_det = 1.0 / det;

        return new Matrix3([
            b01 * inv_det,
            (-a22 * a01 + a02 * a21) * inv_det,
            (a12 * a01 - a02 * a11) * inv_det,
            b11 * inv_det,
            (a22 * a00 - a02 * a20) * inv_det,
            (-a12 * a00 + a02 * a10) * inv_det,
            b21 * inv_det,
            (-a21 * a00 + a01 * a20) * inv_det,
            (a11 * a00 - a01 * a10) * inv_det,
        ]);
    }

    static translation(x, y) {
        // prettier-ignore
        return new Matrix3([
            1, 0, 0,
            0, 1, 0,
            x, y, 1,
        ]);
    }

    translate(x, y) {
        return this.multiply(this.constructor.translation(x, y));
    }

    static scaling(x, y) {
        // prettier-ignore
        return new Matrix3([
            x, 0, 0,
            0, y, 0,
            0, 0, 1,
        ]);
    }

    scale(x, y) {
        return this.multiply(this.constructor.scaling(x, y));
    }

    static rotation(angle) {
        const theta = new Angle(angle).radians;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        // prettier-ignore
        return new Matrix3([
            cos, -sin, 0,
            sin, cos, 0,
            0, 0, 1
        ]);
    }

    rotate(angle) {
        return this.multiply(this.constructor.rotation(angle));
    }
}
