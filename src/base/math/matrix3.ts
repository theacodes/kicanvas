/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Vec2 } from "./vec2";
import { Angle, type AngleLike } from "./angle";

type ElementArray = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
];

/**
 * A 3x3 transformation matrix
 */
export class Matrix3 {
    elements: Float32Array;

    /**
     * Create a new Matrix
     * @param elements the 9 matrix elements
     */
    constructor(elements: ElementArray | Float32Array) {
        if (elements.length != 9) {
            throw new Error(`Matrix3 requires 9 elements, got ${elements}`);
        }
        this.elements = new Float32Array(elements);
    }

    /**
     * Create a Matrix3 from a DOMMatrix
     */
    static from_DOMMatrix(m: DOMMatrix): Matrix3 {
        // prettier-ignore
        return new Matrix3([
            m.m11, m.m12, m.m14,
            m.m21, m.m22, m.m24,
            m.m41, m.m42, m.m44,
        ]);
    }

    /**
     * Create a DOMMatrix from this Matrix3
     */
    to_DOMMatrix(): DOMMatrix {
        const e = this.elements;
        // prettier-ignore
        return new DOMMatrix([
            e[0]!, e[3]!,
            e[1]!, e[4]!,
            e[6]!, e[7]!,
        ]);
    }

    /**
     * Create a 4x4 DOMMatrix from this Matrix3
     */
    to_4x4_DOMMatrix(): DOMMatrix {
        const e = this.elements;
        // prettier-ignore
        return new DOMMatrix([
            e[0]!, e[1]!, 0, e[2]!,
            e[3]!, e[4]!, 0, e[5]!,
            0, 0, 1, 0,
            e[6]!, e[7]!, 0, 1
        ]);
    }

    /**
     * @returns a new identity matrix
     */
    static identity(): Matrix3 {
        // prettier-ignore
        return new Matrix3([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
        ]);
    }

    /**
     * @returns a new matrix representing a 2d orthographic projection
     */
    static orthographic(width: number, height: number): Matrix3 {
        // prettier-ignore
        return new Matrix3([
            2 / width, 0, 0,
            0, -2 / height, 0,
            -1, 1, 1
        ]);
    }

    /**
     * @returns a copy of this matrix
     */
    copy() {
        return new Matrix3(this.elements);
    }

    /**
     * Update this matrix's elements
     */
    set(elements: Float32Array | ElementArray) {
        if (elements.length != 9) {
            throw new Error(`Matrix3 requires 9 elements, got ${elements}`);
        }
        this.elements.set(elements);
    }

    /**
     * Transform a vector by multiplying it with this matrix.
     * @returns A new Vec2
     */
    transform(vec: Vec2): Vec2 {
        const x1 = this.elements[0 * 3 + 0]!;
        const x2 = this.elements[0 * 3 + 1]!;
        const y1 = this.elements[1 * 3 + 0]!;
        const y2 = this.elements[1 * 3 + 1]!;
        const z1 = this.elements[2 * 3 + 0]!;
        const z2 = this.elements[2 * 3 + 1]!;
        const px = vec.x;
        const py = vec.y;

        const x = px * x1 + py * y1 + z1;
        const y = px * x2 + py * y2 + z2;

        return new Vec2(x, y);
    }

    /**
     * Transforms a list of vectors
     * @yields new transformed vectors
     */
    *transform_all(vecs: Iterable<Vec2>) {
        for (const vec of vecs) {
            yield this.transform(vec);
        }
    }

    /**
     * Transforms a list of vector by a given matrix, which may be null.
     */
    static transform_all(mat: Matrix3 | null, vecs: Vec2[]): Vec2[] {
        if (!mat) {
            return vecs;
        }
        return Array.from(mat.transform_all(vecs));
    }

    /**
     * Multiply this matrix by another and store the result
     * in this matrix.
     * @returns this matrix
     */
    multiply_self(b: Matrix3) {
        const a00 = this.elements[0 * 3 + 0]!;
        const a01 = this.elements[0 * 3 + 1]!;
        const a02 = this.elements[0 * 3 + 2]!;
        const a10 = this.elements[1 * 3 + 0]!;
        const a11 = this.elements[1 * 3 + 1]!;
        const a12 = this.elements[1 * 3 + 2]!;
        const a20 = this.elements[2 * 3 + 0]!;
        const a21 = this.elements[2 * 3 + 1]!;
        const a22 = this.elements[2 * 3 + 2]!;
        const b00 = b.elements[0 * 3 + 0]!;
        const b01 = b.elements[0 * 3 + 1]!;
        const b02 = b.elements[0 * 3 + 2]!;
        const b10 = b.elements[1 * 3 + 0]!;
        const b11 = b.elements[1 * 3 + 1]!;
        const b12 = b.elements[1 * 3 + 2]!;
        const b20 = b.elements[2 * 3 + 0]!;
        const b21 = b.elements[2 * 3 + 1]!;
        const b22 = b.elements[2 * 3 + 2]!;

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

    /**
     * Create a new matrix by multiplying this matrix with another
     * @returns a new matrix
     */
    multiply(b: Matrix3) {
        return this.copy().multiply_self(b);
    }

    /**
     * @returns A new matrix that is the inverse of this matrix
     */
    inverse(): Matrix3 {
        const a00 = this.elements[0 * 3 + 0]!;
        const a01 = this.elements[0 * 3 + 1]!;
        const a02 = this.elements[0 * 3 + 2]!;
        const a10 = this.elements[1 * 3 + 0]!;
        const a11 = this.elements[1 * 3 + 1]!;
        const a12 = this.elements[1 * 3 + 2]!;
        const a20 = this.elements[2 * 3 + 0]!;
        const a21 = this.elements[2 * 3 + 1]!;
        const a22 = this.elements[2 * 3 + 2]!;

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

    /**
     * @returns A new matrix representing a 2d translation
     */
    static translation(x: number, y: number): Matrix3 {
        // prettier-ignore
        return new Matrix3([
            1, 0, 0,
            0, 1, 0,
            x, y, 1,
        ]);
    }

    /**
     * Translate this matrix by the given amounts
     * @returns this matrix
     */
    translate_self(x: number, y: number) {
        return this.multiply_self(Matrix3.translation(x, y));
    }

    /**
     * Creates a new matrix representing this matrix translated by the given amount
     * @returns a new matrix
     */
    translate(x: number, y: number): Matrix3 {
        return this.copy().translate_self(x, y);
    }

    /**
     * @returns {Matrix3} A new matrix representing a 2d scale
     */
    static scaling(x: number, y: number): Matrix3 {
        // prettier-ignore
        return new Matrix3([
            x, 0, 0,
            0, y, 0,
            0, 0, 1,
        ]);
    }

    /**
     * Scale this matrix by the given amounts
     * @returns this matrix
     */
    scale_self(x: number, y: number) {
        return this.multiply_self(Matrix3.scaling(x, y));
    }

    /**
     * Creates a new matrix representing this matrix scaled by the given amount
     * @returns a new matrix
     */
    scale(x: number, y: number): Matrix3 {
        return this.copy().scale_self(x, y);
    }

    /**
     * @returns A new matrix representing a 2d rotation
     */
    static rotation(angle: AngleLike): Matrix3 {
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

    /**
     * Rotate this matrix by the given angle
     * @returns this matrix
     */
    rotate_self(angle: AngleLike) {
        return this.multiply_self(Matrix3.rotation(angle));
    }

    /**
     * Creates a new matrix representing this matrix rotated by the given angle
     * @returns a new matrix
     */
    rotate(angle: AngleLike) {
        return this.copy().rotate_self(angle);
    }

    /**
     * Returns the total translation (relative to identity) applied via this matrix.
     */
    get absolute_translation() {
        return this.transform(new Vec2(0, 0));
    }

    /**
     * Retruns the total rotation (relative to identity) applied via this matrix.
     */
    get absolute_rotation() {
        const p0 = this.transform(new Vec2(0, 0));
        const p1 = this.transform(new Vec2(1, 0));
        const pn = p1.sub(p0);
        return pn.angle.normalize();
    }
}
