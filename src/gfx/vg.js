/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { VertexArray, ShaderProgram } from "./gl.js";
import { Vec2 } from "../math/vec2.js";
import earcut from "../math/earcut/earcut.js";

class Tesselator {
    // Each line segment or circle is a two-triangle quad.
    static vertices_per_quad = 2 * 3;

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
        // TODO: this can eventually be removed.
        if (positions.filter((v) => Number.isNaN(v)).length) {
            throw new Error("Degenerate quad");
        }

        return positions;
    }

    static populate_color_data(dest, color, offset, length) {
        if (!color) {
            color = [1, 0, 0, 1];
        }
        for (let i = 0; i < length; i++) {
            dest[offset + i] = color[i % color.length];
        }
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

    static tesselate_line(points, width, color) {
        width = width || 0;

        const segment_count = points.length - 1;
        const vertex_count = segment_count * this.vertices_per_quad;
        const position_data = new Float32Array(vertex_count * 2);
        const color_data = new Float32Array(vertex_count * 4);
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
                Array(this.vertices_per_quad).fill(cap_region),
                vertex_index
            );
            this.populate_color_data(
                color_data,
                color,
                vertex_index * 4,
                this.vertices_per_quad * 4
            );

            vertex_index += this.vertices_per_quad;
        }

        return [
            position_data.slice(0, vertex_index * 2),
            cap_data.slice(0, vertex_index),
            color_data.slice(0, vertex_index * 4),
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
        const vertex_count = circles.length * this.vertices_per_quad;
        const position_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);
        const color_data = new Float32Array(vertex_count * 4);

        for (let i = 0; i < circles.length; i++) {
            const c = circles[i];
            const vertex_index = i * this.vertices_per_quad;
            const cap_region = 1.0;
            const quad = this.tesselate_circle(c);

            position_data.set(this.quad_to_triangles(quad), vertex_index * 2);

            cap_data.set(
                Array(this.vertices_per_quad).fill(cap_region),
                vertex_index
            );

            this.populate_color_data(
                color_data,
                c.color,
                vertex_index * 4,
                this.vertices_per_quad
            );
        }

        return [position_data, color_data, cap_data];
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
        this.color_buf = this.vao.buffer(this.shader.a_color, 4);
        this.vertex_count = 0;
    }

    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.cap_region_buf.dispose();
        this.color_buf.dispose();
    }

    set(circles) {
        const [position_data, cap_data, color_data] =
            Tesselator.tesselate_circles(circles);
        this.position_buf.set(position_data);
        this.cap_region_buf.set(cap_data);
        this.color_buf.set(color_data);
        this.vertex_count = position_data.length / 2;
    }

    draw() {
        if (!this.vertex_count) {
            return;
        }
        this.vao.bind();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertex_count);
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
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
        this.color_buf = this.vao.buffer(this.shader.a_color, 4);
        this.vertex_count = 0;
    }

    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.cap_region_buf.dispose();
        this.color_buf.dispose();
    }

    set(lines) {
        if (!lines.length) {
            return false;
        }

        const vertex_count = lines.reduce((v, e) => {
            return v + (e.points.length - 1) * Tesselator.vertices_per_quad;
        }, 0);

        const position_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);
        const color_data = new Float32Array(vertex_count * 4);

        let position_idx = 0;
        let cap_idx = 0;
        let color_idx = 0;

        for (const line of lines) {
            const [line_position_data, line_cap_data, line_color_data] =
                Tesselator.tesselate_line(line.points, line.width, line.color);

            position_data.set(line_position_data, position_idx);
            position_idx += line_position_data.length;

            cap_data.set(line_cap_data, cap_idx);
            cap_idx += line_cap_data.length;

            color_data.set(line_color_data, color_idx);
            color_idx += line_color_data.length;
        }

        this.position_buf.set(position_data);
        this.cap_region_buf.set(cap_data);
        this.color_buf.set(color_data);

        this.vertex_count = position_idx / 2;
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
        this.color_buf = this.vao.buffer(this.shader.a_color, 4);
        this.vertex_count = 0;
    }

    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.color_buf.dispose();
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
        const total_vertex_data_length = polygons.reduce((p, c) => {
            return p + c.vertices.length;
        }, 0);

        const total_vertices = total_vertex_data_length / 2;

        const vertex_data = new Float32Array(total_vertex_data_length);
        const color_data = new Float32Array(total_vertices * 4);

        let vertex_data_idx = 0;
        let color_data_idx = 0;
        for (const polygon of polygons) {
            const polygon_vertex_count = polygon.vertices.length / 2;

            vertex_data.set(polygon.vertices, vertex_data_idx);
            vertex_data_idx += polygon.vertices.length;

            Tesselator.populate_color_data(
                color_data,
                polygon.color,
                color_data_idx,
                polygon_vertex_count * 4
            );
            color_data_idx += polygon_vertex_count * 4;
        }

        this.position_buf.set(vertex_data);
        this.color_buf.set(color_data);
        this.vertex_count = vertex_data_idx / 2;
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
 * all rendered at the same time (on the same "layer").
 */
export class GeometrySet {
    gl;

    #polygons = [];
    #circles = [];
    #lines = [];

    #polygon_set;
    #circle_set;
    #polyline_set;

    constructor(gl) {
        this.gl = gl;
        this.#polygon_set = new PolygonSet(gl);
        this.#circle_set = new CircleSet(gl);
        this.#polyline_set = new PolylineSet(gl);
    }

    dispose() {
        this.#polygon_set.dispose();
        this.#circle_set.dispose();
        this.#polyline_set.dispose();
    }

    add_circle(point, radius, color) {
        this.#circles.push({
            point: point,
            radius: radius,
            color: color,
        });
    }

    add_polygon(points, color) {
        let triangles = PolygonSet.triangulate(points);
        this.#polygons.push({
            vertices: triangles,
            color: color,
        });
    }

    add_line(points, width, color) {
        this.#lines.push({
            points: points,
            width: width,
            color: color,
        });
    }

    commit() {
        this.#polygon_set.set(this.#polygons);
        this.#polygons = null;
        this.#polyline_set.set(this.#lines);
        this.#lines = null;
        this.#circle_set.set(this.#circles);
        this.#circles = null;
    }

    draw(matrix) {
        this.#polygon_set.shader.bind();
        this.#polygon_set.shader.u_matrix.mat3f(false, matrix.elements);
        this.#polygon_set.draw();

        this.#circle_set.shader.bind();
        this.#circle_set.shader.u_matrix.mat3f(false, matrix.elements);
        this.#circle_set.draw();

        this.#polyline_set.shader.bind();
        this.#polyline_set.shader.u_matrix.mat3f(false, matrix.elements);
        this.#polyline_set.draw();
    }
}
