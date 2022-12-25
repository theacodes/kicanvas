/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { VertexArray, ShaderProgram } from "./gl.js";
import { Vec2 } from "../math/vec2.js";
import earcut from "../math/earcut/earcut.js";

export class CircleSet {
    static shader;

    // Each circle is represented by a two-triangle quad.
    static vertices_per_point = 2 * 3;

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
        const vertex_count = circles.length * this.vertices_per_point;
        const position_data = new Float32Array(vertex_count * 2);
        const linespace_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);

        for (let i = 0; i < circles.length; i++) {
            const c = circles[i];
            const vertex_index = i * this.vertices_per_point;
            const cap_region = 1.0;
            const quad = this.tesselate_circle(c);

            position_data.set(
                [
                    ...quad[0],
                    ...quad[2],
                    ...quad[1],
                    ...quad[1],
                    ...quad[2],
                    ...quad[3],
                ],
                vertex_index * 2
            );

            linespace_data.set(
                [
                    // first triangle
                    -1,
                    -1, //
                    1,
                    -1, //
                    -1,
                    1, //
                    // second triangle
                    -1,
                    1, //
                    1,
                    -1, //
                    1,
                    1, //
                ],
                vertex_index * 2
            );

            cap_data.set(
                [
                    cap_region,
                    cap_region,
                    cap_region,
                    cap_region,
                    cap_region,
                    cap_region,
                ],
                vertex_index
            );
        }

        return [position_data, linespace_data, cap_data];
    }

    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader ?? this.constructor.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.linespace_buf = this.vao.buffer(this.shader.a_linespace, 2);
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
        this.vertex_count = 0;
    }

    set(circles) {
        const [position_data, space_data, cap_data] =
            this.constructor.tesselate_circles(circles);
        this.position_buf.set(position_data);
        this.linespace_buf.set(space_data);
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

export class Polyline {
    static shader;

    // Each line segment is a two-triangle quad.
    static vertices_per_segment = 2 * 3;

    static async load_shader(gl) {
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            "./polyline.vert.glsl",
            "./polyline.frag.glsl"
        );
    }

    static tesselate_segment(p1, p2, width) {
        const line = p2.sub(p1);
        const norm = line.normal.normalize();
        const n = norm.mul_scalar(width / 2);
        const n2 = n.normal;

        let a = p1.add(n).add(n2);
        let b = p1.sub(n).add(n2);
        let c = p2.add(n).sub(n2);
        let d = p2.sub(n).sub(n2);

        return [a, b, c, d];
    }

    static tesselate_line(points, width) {
        width = width || 0;

        const vertex_count = (points.length - 1) * this.vertices_per_segment;
        const position_data = new Float32Array(vertex_count * 2);
        const linespace_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);
        let vertex_index = 0;

        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];

            const length = p2.sub(p1).length;
            const quad = this.tesselate_segment(p1, p2, width);
            const cap_region = width / (length + width);

            const positions = [
                ...quad[0],
                ...quad[2],
                ...quad[1],
                ...quad[1],
                ...quad[2],
                ...quad[3],
            ];

            if (positions.filter((v) => Number.isNaN(v)).length) {
                continue;
            }

            position_data.set(positions, vertex_index * 2);

            linespace_data.set(
                [
                    // first triangle
                    -1,
                    -1, //
                    1,
                    -1, //
                    -1,
                    1, //
                    // second triangle
                    -1,
                    1, //
                    1,
                    -1, //
                    1,
                    1, //
                ],
                vertex_index * 2
            );

            cap_data.set(
                [
                    cap_region,
                    cap_region,
                    cap_region,
                    cap_region,
                    cap_region,
                    cap_region,
                ],
                vertex_index
            );

            vertex_index += this.vertices_per_segment;
        }

        return [
            position_data.slice(0, vertex_index * 2),
            linespace_data.slice(0, vertex_index * 2),
            cap_data.slice(0, vertex_index),
        ];
    }

    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader ?? this.constructor.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.linespace_buf = this.vao.buffer(this.shader.a_linespace, 2);
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
    }

    set(points, width) {
        const [position_data, space_data, cap_data] =
            this.constructor.tesselate_line(points, width);
        this.position_buf.set(position_data);
        this.linespace_buf.set(space_data);
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
        this.linespace_buf = this.vao.buffer(this.shader.a_linespace, 2);
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
        this.vertex_count = 0;
    }

    set(lines) {
        const vertex_count = lines.reduce((v, e) => {
            return v + (e.points.length - 1) * Polyline.vertices_per_segment;
        }, 0);

        const position_data = new Float32Array(vertex_count * 2);
        const space_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);

        let line_offset = 0;
        for (const line of lines) {
            const [line_position_data, line_space_data, line_cap_data] =
                Polyline.tesselate_line(line.points, line.width);

            position_data.set(line_position_data, line_offset);
            space_data.set(line_space_data, line_offset);
            cap_data.set(line_cap_data, line_offset / 2);
            line_offset += line_position_data.length;
        }

        this.position_buf.set(position_data);
        this.linespace_buf.set(space_data);
        this.cap_region_buf.set(cap_data);
        this.vertex_count = line_offset;
    }

    draw() {
        if (!this.vertex_count) {
            return;
        }
        this.vao.bind();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertex_count / 2);
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
