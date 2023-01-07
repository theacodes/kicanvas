/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { VertexArray, ShaderProgram } from "./gl.js";
import { Vec2 } from "../math/vec2.js";
import earcut from "../math/earcut/earcut.js";

class Tesselator {
    // Each line segment is a two-triangle quad.
    static vertices_per_segment = 2 * 3;

    // Each circle is represented by a two-triangle quad.
    static vertices_per_circle = 2 * 3;

    static quad_to_triangles(quad) {
        const positions = [
            ...quad[0],
            ...quad[2],
            ...quad[1],
            ...quad[1],
            ...quad[2],
            ...quad[3],
        ];

        // check for degenerate quads
        if (positions.filter((v) => Number.isNaN(v)).length) {
            throw new Error("Degenerate quad");
        }

        return positions;
    }

    static tesselate_segment(p1, p2, width) {
        const line = p2.sub(p1);
        const norm = line.normal.normalize();
        const n = norm.multiply(width / 2);
        const n2 = n.normal;

        let a = p1.add(n).add(n2);
        let b = p1.sub(n).add(n2);
        let c = p2.add(n).sub(n2);
        let d = p2.sub(n).sub(n2);

        return [a, b, c, d];
    }

    static tesselate_line(points, width) {
        width = width || 0;

        const segment_count = points.length - 1;
        const vertex_count = segment_count * this.vertices_per_segment;
        const position_data = new Float32Array(vertex_count * 2);
        // const color_data = new Float32Array(vertex_count * 4);
        const cap_data = new Float32Array(vertex_count);
        let vertex_index = 0;

        for (let segment_num = 1; segment_num < points.length; segment_num++) {
            const p1 = points[segment_num - 1];
            const p2 = points[segment_num];

            const length = p2.sub(p1).length;

            // skip zero-length segments
            if (length == 0) {
                continue;
            }

            const quad = this.tesselate_segment(p1, p2, width);
            const cap_region = width / (length + width);

            position_data.set(this.quad_to_triangles(quad), vertex_index * 2);
            cap_data.set(
                Array(this.vertices_per_circle).fill(cap_region),
                vertex_index
            );

            vertex_index += this.vertices_per_segment;
        }

        return [
            position_data.slice(0, vertex_index * 2),
            cap_data.slice(0, vertex_index),
        ];
    }

    static tesselate_circle(circle) {
        const n = new Vec2(circle.radius, 0);
        const n2 = n.normal;

        let a = circle.point.add(n).add(n2);
        let b = circle.point.sub(n).add(n2);
        let c = circle.point.add(n).sub(n2);
        let d = circle.point.sub(n).sub(n2);

        return [a, b, c, d];
    }

    static tesselate_circles(circles) {
        const vertex_count = circles.length * this.vertices_per_circle;
        const position_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);

        for (let i = 0; i < circles.length; i++) {
            const c = circles[i];
            const vertex_index = i * this.vertices_per_circle;
            const cap_region = 1.0;
            const quad = this.tesselate_circle(c);

            position_data.set(this.quad_to_triangles(quad), vertex_index * 2);

            cap_data.set(
                Array(this.vertices_per_circle).fill(cap_region),
                vertex_index
            );
        }

        return [position_data, cap_data];
    }
}

export class CircleSet {
    static shader;

    static async load_shader(gl) {
        // This re-uses the same shader that polyline uses, since the polyline
        // is pill-shaped, circle is just a special case of a zero-length polyline.
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            "./polyline.vert.glsl",
            "./polyline.frag.glsl"
        );
    }

    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader ?? this.constructor.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
        this.vertex_count = 0;
    }

    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.cap_region_buf.dispose();
    }

    set(circles) {
        const [position_data, cap_data] = Tesselator.tesselate_circles(circles);
        this.position_buf.set(position_data);
        this.cap_region_buf.set(cap_data);
        this.vertex_count = position_data.length;
    }

    draw() {
        if (!this.vertex_count) {
            return;
        }
        this.vao.bind();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertex_count / 2);
    }
}

export class PolylineSet {
    static shader;

    static async load_shader(gl) {
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            "./polyline.vert.glsl",
            "./polyline.frag.glsl"
        );
    }

    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader ?? this.constructor.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.cap_region_buf = this.vao.buffer(
            this.shader.a_cap_region,
            1,
            this.gl.FLOAT,
            false,
            0
        );
        this.vertex_count = 0;
    }

    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.cap_region_buf.dispose();
    }

    set(lines) {
        if (!lines.length) {
            return false;
        }

        const vertex_count = lines.reduce((v, e) => {
            return v + (e.points.length - 1) * Tesselator.vertices_per_segment;
        }, 0);

        const position_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);

        let line_offset = 0;
        let cap_offset = 0;
        for (const line of lines) {
            const [line_position_data, line_cap_data] =
                Tesselator.tesselate_line(line.points, line.width);

            position_data.set(line_position_data, line_offset);
            cap_data.set(line_cap_data, cap_offset);
            cap_offset += line_cap_data.length;
            line_offset += line_position_data.length;
        }

        this.position_buf.set(position_data);
        this.cap_region_buf.set(cap_data);
        // console.log(cap_data);
        this.vertex_count = line_offset / 2;
    }

    draw() {
        if (!this.vertex_count) {
            return;
        }
        this.vao.bind();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertex_count);
    }
}

export class PolygonSet {
    static shader;

    static async load_shader(gl) {
        this.shader = await ShaderProgram.load(
            gl,
            "polygon",
            "./polygon.vert.glsl",
            "./polygon.frag.glsl"
        );
    }

    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader || this.constructor.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.vertex_count = 0;
    }

    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
    }

    static triangulate(points) {
        const points_flattened = new Array(points.length * 2);
        for (let i = 0; i < points.length; i++) {
            points_flattened[i * 2] = points[i].x;
            points_flattened[i * 2 + 1] = points[i].y;
        }

        if (points.length == 3) {
            return new Float32Array(points_flattened);
        }

        const triangle_indexes = earcut(points_flattened);

        const triangles = new Float32Array(triangle_indexes.length * 2);

        for (let i = 0; i < triangle_indexes.length; i++) {
            const index = triangle_indexes[i];
            triangles[i * 2] = points_flattened[index * 2];
            triangles[i * 2 + 1] = points_flattened[index * 2 + 1];
        }

        return triangles;
    }

    static polyline_from_triangles(triangles) {
        const lines = [];
        for (let i = 0; i < triangles.length; i += 6) {
            const a = new Vec2(triangles[i], triangles[i + 1]);
            const b = new Vec2(triangles[i + 2], triangles[i + 3]);
            const c = new Vec2(triangles[i + 4], triangles[i + 5]);
            lines.push([a, b, c, a]);
        }
        return lines;
    }

    set(polygons) {
        const total_triangles = polygons.reduce((p, c) => {
            return p + c.length;
        }, 0);
        const triangles = new Float32Array(total_triangles);

        let offset = 0;
        for (const polygon of polygons) {
            triangles.set(polygon, offset);
            offset += polygon.length;
        }

        this.position_buf.set(triangles);
        this.vertex_count = triangles.length / 2;
    }

    draw() {
        if (!this.vertex_count) {
            return;
        }
        this.vao.bind();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertex_count);
    }
}

/**
 * Represents a single set of vector objects (lines, circles, etc.) that are
 * all rendered at the same time with the same colors.
 */
export class GeometrySet {
    gl;
    #polygons;
    #circles;
    #polylines;

    constructor(gl) {
        this.gl = gl;
        this.polygons = new PolygonSet(gl);
        this.circles = new CircleSet(gl);
        this.polylines = new PolylineSet(gl);
    }

    set_polygons(polys) {
        if (this.#polygons) {
            this.#polygons.dispose();
        }
        this.#polygons = new PolygonSet(this.gl);
        this.#polygons.set(polys);
    }

    set_circles(circles) {
        if (this.#circles) {
            this.#circles.dispose();
        }
        this.#circles = new CircleSet(this.gl);
        this.#circles.set(circles);
    }

    set_polylines(polylines) {
        if (this.#polylines) {
            this.#polylines.dispose();
        }
        this.#polylines = new PolylineSet(this.gl);
        this.#polylines.set(polylines);
    }

    draw(matrix, color) {
        if (this.#polygons) {
            this.#polygons.shader.bind();
            this.#polygons.shader.u_matrix.mat3f(false, matrix.elements);
            this.#polygons.shader.u_color.f4(...color);
            this.#polygons.draw();
        }

        if (this.#circles) {
            this.#circles.shader.bind();
            this.#circles.shader.u_matrix.mat3f(false, matrix.elements);
            this.#circles.shader.u_color.f4(...color);
            this.#circles.draw();
        }

        if (this.#polylines) {
            this.#polylines.shader.bind();
            this.#polylines.shader.u_matrix.mat3f(false, matrix.elements);
            this.#polylines.shader.u_color.f4(...color);
            this.#polylines.draw();
        }
    }
}
