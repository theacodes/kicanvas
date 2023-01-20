/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Containers for efficiently rendering sets of basic geometric primitives.
 *
 * The highest-level and easiest to use interface is PrimitiveSet, which
 * provides a "layer" of mixed primitives.
 *
 * The core principle here is primitive sets. These sets collect all the data
 * necessary to render *multiple* primitives. Primitive sets are write-once.
 * Call set() with a list of primitive objects to tesselate them and upload
 * their data to the GPU. Use draw() to have the GPU render the tesselated
 * geometry. Use dispose() to free GPU resources.
 *
 */

import { VertexArray, ShaderProgram } from "./gl.js";
import { Vec2 } from "../math/vec2.js";
import earcut from "../math/earcut/earcut.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Matrix3 } from "../math/matrix3.js";

/** Circle primitive data */
export class Circle {
    /**
     * Create a filled circle
     * @param {Vec2} point
     * @param {number} radius
     * @param {number[]} color - normalized array of rgba
     */
    constructor(point, radius, color) {
        this.point = point;
        this.radius = radius;
        this.color = color;
    }
}

/** Polyline primitive data */
export class Polyline {
    /**
     * Create a stroked polyline
     * @param {Vec2[]} points - line segment points
     * @param {number} width - thickness of the rendered line
     * @param {number[]} color - normalized array of rgba
     */
    constructor(points, width, color) {
        this.points = points;
        this.width = width;
        this.color = color;
    }
}

/** Polygon primitive data */
export class Polygon {
    /**
     * Create a filled polygon
     * @param {Vec2[]} points - point cloud representing the polygon
     * @param {number[]} color - normalized array of rgba
     */
    constructor(points, color) {
        this.points = points;
        this.color = color;
        this.vertices = null;
    }
    /**
     * Convert a point cloud polygon into an array of triangles.
     * Populates this.vertices with the triangles and clears this.points.
     */
    triangulate() {
        if (this.vertices) {
            return;
        }

        let points = this.points;

        const points_flattened = new Array(points.length * 2);
        for (let i = 0; i < points.length; i++) {
            points_flattened[i * 2] = points[i].x;
            points_flattened[i * 2 + 1] = points[i].y;
        }

        // shortcut if the polygon is a single triangle.
        if (points.length == 3) {
            this.points = [];
            this.vertices = new Float32Array(points_flattened);
            return;
        }

        const triangle_indexes = earcut(points_flattened);

        const vertices = new Float32Array(triangle_indexes.length * 2);

        for (let i = 0; i < triangle_indexes.length; i++) {
            const index = triangle_indexes[i];
            vertices[i * 2] = points_flattened[index * 2];
            vertices[i * 2 + 1] = points_flattened[index * 2 + 1];
        }

        this.points = [];
        this.vertices = vertices;
    }
}

class Tesselator {
    // Each line segment or circle is a two-triangle quad.
    static vertices_per_quad = 2 * 3;

    /**
     * Convert a quad to two triangles that cover the same area
     * @param {Array.<Vec2>} quad - four points defining the quad
     * @returns {number[]} - six points representing two triangles
     */
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

    /**
     * Populate an array with repeated copies of the given color
     * @param {Float32Array} dest
     * @param {number[]} color - normalized rgba values
     * @param {number} offset
     * @param {number} length
     */
    static populate_color_data(dest, color, offset, length) {
        if (!color) {
            color = [1, 0, 0, 1];
        }
        for (let i = 0; i < length; i++) {
            dest[offset + i] = color[i % color.length];
        }
    }

    /**
     * Tesselate a line segment into a quad
     * @param {Vec2} p1
     * @param {Vec2} p2
     * @param {number} width
     * @returns {Array.<Vec2>} four points representing the line segment.
     */
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

    /**
     * Tesselate a Polyline into renderable data.
     * @param {Polyline} polyline
     * @returns {{position_array: Float32Array, cap_array: Float32Array, color_array: Float32Array}}
     */
    static tesselate_polyline(polyline) {
        let width = polyline.width || 0;
        let points = polyline.points;
        let color = polyline.color;

        const segment_count = points.length - 1;
        const vertex_count = segment_count * this.vertices_per_quad;
        const position_data = new Float32Array(vertex_count * 2);
        const color_data = new Float32Array(vertex_count * 4);
        const cap_data = new Float32Array(vertex_count);
        let vertex_index = 0;

        for (let segment_num = 1; segment_num < points.length; segment_num++) {
            const p1 = points[segment_num - 1];
            const p2 = points[segment_num];

            const length = p2.sub(p1).magnitude;

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

        return {
            position_array: position_data.slice(0, vertex_index * 2),
            cap_array: cap_data.slice(0, vertex_index),
            color_array: color_data.slice(0, vertex_index * 4),
        };
    }

    /**
     * Tesselate a circle into a quad
     * @param {Circle} circle
     * @returns {Array.<Vec2>} four points representing the quad
     */
    static tesselate_circle(circle) {
        const n = new Vec2(circle.radius, 0);
        const n2 = n.normal;

        let a = circle.point.add(n).add(n2);
        let b = circle.point.sub(n).add(n2);
        let c = circle.point.add(n).sub(n2);
        let d = circle.point.sub(n).sub(n2);

        return [a, b, c, d];
    }

    /**
     * Tesselate an array of circles into renderable data
     * @param {Circle[]} circles
     * @returns {{position_array: Float32Array, cap_array: Float32Array, color_array: Float32Array}}
     */
    static tesselate_circles(circles) {
        const vertex_count = circles.length * this.vertices_per_quad;
        const position_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);
        const color_data = new Float32Array(vertex_count * 4);
        let vertex_index = 0;

        for (let i = 0; i < circles.length; i++) {
            const c = circles[i];
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
                this.vertices_per_quad * 4
            );

            vertex_index += this.vertices_per_quad;
        }

        return {
            position_array: position_data.slice(0, vertex_index * 2),
            cap_array: cap_data.slice(0, vertex_index),
            color_array: color_data.slice(0, vertex_index * 4),
        };
    }
}

/**
 * A set of filled circles.
 */
export class CircleSet {
    static shader;

    /**
     * Load the shader program required to render this primitive.
     * @param {WebGL2RenderingContext} gl
     */
    static async load_shader(gl) {
        // This re-uses the same shader that polyline uses, since the polyline
        // is pill-shaped, circle is just a special case of a zero-length polyline.
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            "./resources/polyline.vert.glsl",
            "./resources/polyline.frag.glsl"
        );
    }

    /**
     * Create a new circle set.
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram?} shader - optional override for the shader program used when drawing.
     */
    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader ?? CircleSet.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
        this.color_buf = this.vao.buffer(this.shader.a_color, 4);
        this.vertex_count = 0;
    }

    /**
     * Release GPU resources
     */
    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.cap_region_buf.dispose();
        this.color_buf.dispose();
    }

    /**
     * Tesselate an array of circles and upload them to the GPU.
     * @param {Circle[]} circles
     */
    set(circles) {
        const { position_array, cap_array, color_array } =
            Tesselator.tesselate_circles(circles);
        this.position_buf.set(position_array);
        this.cap_region_buf.set(cap_array);
        this.color_buf.set(color_array);
        this.vertex_count = position_array.length / 2;
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
 * A set of stroked polylines
 */
export class PolylineSet {
    static shader;

    /**
     * Load the shader program required to render this primitive.
     * @param {WebGL2RenderingContext} gl
     */
    static async load_shader(gl) {
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            "./resources/polyline.vert.glsl",
            "./resources/polyline.frag.glsl"
        );
    }

    /**
     * Create a new polyline set.
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram?} shader - optional override for the shader program used when drawing.
     */
    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader ?? PolylineSet.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.cap_region_buf = this.vao.buffer(this.shader.a_cap_region, 1);
        this.color_buf = this.vao.buffer(this.shader.a_color, 4);
        this.vertex_count = 0;
    }

    /**
     * Release GPU resources
     */
    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.cap_region_buf.dispose();
        this.color_buf.dispose();
    }

    /**
     * Tesselate an array of polylines and upload them to the GPU.
     * @param {Polyline[]} lines
     */
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
            const { position_array, cap_array, color_array } =
                Tesselator.tesselate_polyline(line);

            position_data.set(position_array, position_idx);
            position_idx += position_array.length;

            cap_data.set(cap_array, cap_idx);
            cap_idx += cap_array.length;

            color_data.set(color_array, color_idx);
            color_idx += color_array.length;
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

/**
 * A set of filled polygons
 */
export class PolygonSet {
    static shader;

    /**
     * Load the shader program required to render this primitive.
     * @param {WebGL2RenderingContext} gl
     */
    static async load_shader(gl) {
        this.shader = await ShaderProgram.load(
            gl,
            "polygon",
            "./resources/polygon.vert.glsl",
            "./resources/polygon.frag.glsl"
        );
    }

    /**
     * Create a new polygon set.
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram?} shader - optional override for the shader program used when drawing.
     */
    constructor(gl, shader = null) {
        this.gl = gl;
        this.shader = shader || PolygonSet.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader.a_position, 2);
        this.color_buf = this.vao.buffer(this.shader.a_color, 4);
        this.vertex_count = 0;
    }

    /**
     * Release GPU resources
     */
    dispose() {
        this.vao.dispose();
        this.position_buf.dispose();
        this.color_buf.dispose();
    }

    /**
     * Convert an array of triangle vertices to polylines.
     *
     * This is a helper function for debugging. It allows easily drawing the
     * outlines of the results of triangulation.
     *
     * @param {Float32Array} triangles
     * @returns {Polyline[]}
     */
    static polyline_from_triangles(triangles, width, color) {
        const lines = [];
        for (let i = 0; i < triangles.length; i += 6) {
            const a = new Vec2(triangles[i], triangles[i + 1]);
            const b = new Vec2(triangles[i + 2], triangles[i + 3]);
            const c = new Vec2(triangles[i + 4], triangles[i + 5]);
            lines.push(new Polyline([a, b, c, a], width, color));
        }
        return lines;
    }

    /**
     * Tesselate (triangulate) and upload a list of polygons to the GPU.
     * @param {Polygon[]} polygons
     */
    set(polygons) {
        let total_vertex_data_length = 0;

        for (const polygon of polygons) {
            polygon.triangulate();
            total_vertex_data_length += polygon.vertices?.length ?? 0;
        }

        const total_vertices = total_vertex_data_length / 2;

        const vertex_data = new Float32Array(total_vertex_data_length);
        const color_data = new Float32Array(total_vertices * 4);

        let vertex_data_idx = 0;
        let color_data_idx = 0;
        for (const polygon of polygons) {
            if (polygon.vertices == null) {
                continue;
            }

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
 * A set of primitives
 *
 * This is the primary interface to this module. It's used to collect a set
 * of primitives (circles, polylines, and polygons), upload their data to the
 * GPU, and draw them together. This is conceptually a "layer", all primitives
 * are drawn at the same depth.
 *
 * Like the underlying primitive sets, this is intended to be write once. Once
 * you call commit() the primitive data is released from working RAM and exists
 * only in the GPU buffers. To modify the data, you'd dispose() of this layer
 * and create a new one.
 *
 */
export class PrimitiveSet {
    gl;

    #polygons = [];
    #circles = [];
    #lines = [];

    #polygon_set;
    #circle_set;
    #polyline_set;

    /**
     * Load all shader programs required to render primitives.
     * @param {WebGL2RenderingContext} gl
     */
    static async load_shaders(gl) {
        await Promise.all([
            PolygonSet.load_shader(gl),
            PolylineSet.load_shader(gl),
            CircleSet.load_shader(gl),
        ]);
    }

    /**
     * Create a new primitive set
     * @param {WebGL2RenderingContext} gl
     */
    constructor(gl) {
        this.gl = gl;
    }

    /**
     * Release GPU resources
     */
    dispose() {
        this.#polygon_set?.dispose();
        this.#circle_set?.dispose();
        this.#polyline_set?.dispose();
    }

    /**
     * Collect a new filled circle
     * @param {Vec2} point
     * @param {number} radius
     * @param {number[]} color - normalized rgba values
     */
    add_circle(point, radius, color) {
        this.#circles.push({
            point: point,
            radius: radius,
            color: color,
        });
    }

    /**
     * Collect a new filled polygon
     * @param {Array.<Vec2>} points
     * @param {number[]} color - normalized rgba values
     */
    add_polygon(points, color) {
        this.#polygons.push(new Polygon(points, color));
    }

    /**
     * Collect a new polyline
     * @param {Array.<Vec2>} points
     * @param {number} width
     * @param {number[]} color - normalized rgba values
     */
    add_line(points, width, color) {
        this.#lines.push({
            points: points,
            width: width,
            color: color,
        });
    }

    /**
     * Tesselate all collected primitives and upload their data to the GPU.
     */
    commit() {
        if (this.#polygons.length) {
            this.#polygon_set = new PolygonSet(this.gl);
            this.#polygon_set.set(this.#polygons);
            this.#polygons = [];
        }
        if (this.#lines.length) {
            this.#polyline_set = new PolylineSet(this.gl);
            this.#polyline_set.set(this.#lines);
            this.#lines = [];
        }
        if (this.#circles.length) {
            this.#circle_set = new CircleSet(this.gl);
            this.#circle_set.set(this.#circles);
            this.#circles = [];
        }
    }

    /**
     * Draw all the previously commit()ed primitives
     * @param {Matrix3} matrix - complete view/projection matrix
     * @param {number} depth - used for depth testing
     */
    draw(matrix, depth = 0) {
        if (this.#polygon_set) {
            this.#polygon_set.shader.bind();
            this.#polygon_set.shader.u_matrix.mat3f(false, matrix.elements);
            this.#polygon_set.shader.u_depth.f1(depth);
            this.#polygon_set.draw();
        }

        if (this.#circle_set) {
            this.#circle_set.shader.bind();
            this.#circle_set.shader.u_matrix.mat3f(false, matrix.elements);
            this.#circle_set.shader.u_depth.f1(depth);
            this.#circle_set.draw();
        }

        if (this.#polyline_set) {
            this.#polyline_set.shader.bind();
            this.#polyline_set.shader.u_matrix.mat3f(false, matrix.elements);
            this.#polyline_set.shader.u_depth.f1(depth);
            this.#polyline_set.draw();
        }
    }
}
