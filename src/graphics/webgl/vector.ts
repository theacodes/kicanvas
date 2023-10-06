/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Low-level library for efficiently rendering sets of basic geometric
 * primitives using WebGL. Think of it as a really hard to use version
 * of SVG. This is the underlying code used by WebGL2Renderer to actually
 * turn abstract primitives into WebGL stuff.
 *
 * The highest-level and easiest to use interface is PrimitiveSet, which
 * provides a container of mixed primitives.
 *
 * The core principle here is primitive sets. These sets collect all the data
 * necessary to render *multiple* primitives. Primitive sets are write-once.
 * Call set() with a list of primitive objects to tesselate them and upload
 * their data to the GPU. Use draw() to have the GPU render the tesselated
 * geometry. Use dispose() to free GPU resources.
 *
 */

import earcut from "../../../third_party/earcut/earcut";
import { Color } from "../../base/color";
import type { IDisposable } from "../../base/disposable";
import { Matrix3, Vec2 } from "../../base/math";
import { Circle, Polygon, Polyline } from "../shapes";
import { Buffer, ShaderProgram, VertexArray } from "./helpers";
import polygon_frag_shader_src from "./polygon.frag.glsl";
import polygon_vert_shader_src from "./polygon.vert.glsl";
import polyline_frag_shader_src from "./polyline.frag.glsl";
import polyline_vert_shader_src from "./polyline.vert.glsl";

/**
 * Tesselator handles converting abstract primitives into triangles that
 * can be passed to the GPU and shaded.
 */
class Tesselator {
    // Each line segment or circle is a two-triangle quad.
    static vertices_per_quad = 2 * 3;

    /**
     * Convert a quad to two triangles that cover the same area
     * @param quad four points defining the quad
     * @returns six points representing two triangles
     */
    static quad_to_triangles(quad: [Vec2, Vec2, Vec2, Vec2]): number[] {
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
     */
    static populate_color_data(
        dest: Float32Array,
        color: Color,
        offset: number,
        length: number,
    ) {
        if (!color) {
            color = new Color(1, 0, 0, 1);
        }
        const color_data = color.to_array();
        for (let i = 0; i < length; i++) {
            dest[offset + i] = color_data[i % color_data.length]!;
        }
    }

    /**
     * Tesselate a line segment into a quad
     * @returns four points representing the line segment.
     */
    static tesselate_segment(
        p1: Vec2,
        p2: Vec2,
        width: number,
    ): [Vec2, Vec2, Vec2, Vec2] {
        const line = p2.sub(p1);
        const norm = line.normal.normalize();
        const n = norm.multiply(width / 2);
        const n2 = n.normal;

        const a = p1.add(n).add(n2);
        const b = p1.sub(n).add(n2);
        const c = p2.add(n).sub(n2);
        const d = p2.sub(n).sub(n2);

        return [a, b, c, d];
    }

    /**
     * Tesselate a Polyline into renderable data.
     */
    static tesselate_polyline(polyline: Polyline) {
        const width = polyline.width || 0;
        const points = polyline.points;
        const color = polyline.color;

        const segment_count = points.length - 1;
        const vertex_count = segment_count * this.vertices_per_quad;
        const position_data = new Float32Array(vertex_count * 2);
        const color_data = new Float32Array(vertex_count * 4);
        const cap_data = new Float32Array(vertex_count);
        let vertex_index = 0;

        for (let segment_num = 1; segment_num < points.length; segment_num++) {
            const p1 = points[segment_num - 1]!;
            const p2 = points[segment_num]!;

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
                vertex_index,
            );
            this.populate_color_data(
                color_data,
                color as Color,
                vertex_index * 4,
                this.vertices_per_quad * 4,
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
     * @returns four points representing the quad
     */
    static tesselate_circle(circle: Circle): [Vec2, Vec2, Vec2, Vec2] {
        const n = new Vec2(circle.radius, 0);
        const n2 = n.normal;

        const a = circle.center.add(n).add(n2);
        const b = circle.center.sub(n).add(n2);
        const c = circle.center.add(n).sub(n2);
        const d = circle.center.sub(n).sub(n2);

        return [a, b, c, d];
    }

    /**
     * Tesselate an array of circles into renderable data
     */
    static tesselate_circles(circles: Circle[]) {
        const vertex_count = circles.length * this.vertices_per_quad;
        const position_data = new Float32Array(vertex_count * 2);
        const cap_data = new Float32Array(vertex_count);
        const color_data = new Float32Array(vertex_count * 4);
        let vertex_index = 0;

        for (let i = 0; i < circles.length; i++) {
            const c = circles[i]!;
            const cap_region = 1.0;
            const quad = this.tesselate_circle(c);

            position_data.set(this.quad_to_triangles(quad), vertex_index * 2);

            cap_data.set(
                Array(this.vertices_per_quad).fill(cap_region),
                vertex_index,
            );

            this.populate_color_data(
                color_data,
                c.color as Color,
                vertex_index * 4,
                this.vertices_per_quad * 4,
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
     * Convert a point cloud polygon into an array of triangles.
     * Populates this.vertices with the triangles and clears this.points.
     */
    static triangulate_polygon(polygon: Polygon) {
        if (polygon.vertices) {
            return polygon;
        }

        const points = polygon.points;

        const points_flattened = new Array(points.length * 2);
        for (let i = 0; i < points.length; i++) {
            const pt = points[i]!;
            points_flattened[i * 2] = pt.x;
            points_flattened[i * 2 + 1] = pt.y;
        }

        // shortcut if the polygon is a single triangle.
        if (points.length == 3) {
            polygon.points = [];
            polygon.vertices = new Float32Array(points_flattened);
            return polygon;
        }

        const triangle_indexes = earcut(points_flattened);

        const vertices = new Float32Array(triangle_indexes.length * 2);

        for (let i = 0; i < triangle_indexes.length; i++) {
            const index = triangle_indexes[i];
            vertices[i * 2] = points_flattened[index * 2];
            vertices[i * 2 + 1] = points_flattened[index * 2 + 1];
        }

        polygon.points = [];
        polygon.vertices = vertices;

        return polygon;
    }
}

/**
 * A set of filled circles.
 */
export class CircleSet implements IDisposable {
    static shader: ShaderProgram;
    shader: ShaderProgram;
    vao: VertexArray;
    position_buf: Buffer;
    cap_region_buf: Buffer;
    color_buf: Buffer;
    vertex_count: number;

    /**
     * Load the shader program required to render this primitive.
     */
    static async load_shader(gl: WebGL2RenderingContext) {
        // This re-uses the same shader that polyline uses, since the polyline
        // is pill-shaped, circle is just a special case of a zero-length polyline.
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            polyline_vert_shader_src,
            polyline_frag_shader_src,
        );
    }

    /**
     * Create a new circle set.
     * @param shader - optional override for the shader program used when drawing.
     */
    constructor(
        public gl: WebGL2RenderingContext,
        shader?: ShaderProgram,
    ) {
        this.shader = shader ?? CircleSet.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader["a_position"], 2);
        this.cap_region_buf = this.vao.buffer(this.shader["a_cap_region"], 1);
        this.color_buf = this.vao.buffer(this.shader["a_color"], 4);
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
     */
    set(circles: Circle[]) {
        const { position_array, cap_array, color_array } =
            Tesselator.tesselate_circles(circles);
        this.position_buf.set(position_array);
        this.cap_region_buf.set(cap_array);
        this.color_buf.set(color_array);
        this.vertex_count = position_array.length / 2;
    }

    render() {
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
export class PolylineSet implements IDisposable {
    static shader: ShaderProgram;
    shader: ShaderProgram;
    vao: VertexArray;
    position_buf: Buffer;
    cap_region_buf: Buffer;
    color_buf: Buffer;
    vertex_count: number;

    /**
     * Load the shader program required to render this primitive.
     */
    static async load_shader(gl: WebGL2RenderingContext) {
        this.shader = await ShaderProgram.load(
            gl,
            "polyline",
            polyline_vert_shader_src,
            polyline_frag_shader_src,
        );
    }

    /**
     * Create a new polyline set.
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram?} shader - optional override for the shader program used when drawing.
     */
    constructor(
        public gl: WebGL2RenderingContext,
        shader?: ShaderProgram,
    ) {
        this.shader = shader ?? PolylineSet.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader["a_position"], 2);
        this.cap_region_buf = this.vao.buffer(this.shader["a_cap_region"], 1);
        this.color_buf = this.vao.buffer(this.shader["a_color"], 4);
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
     */
    set(lines: Polyline[]) {
        if (!lines.length) {
            return;
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

    render() {
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
export class PolygonSet implements IDisposable {
    static shader: ShaderProgram;
    shader: ShaderProgram;
    vao: VertexArray;
    position_buf: Buffer;
    color_buf: Buffer;
    vertex_count: number;

    /**
     * Load the shader program required to render this primitive.
     */
    static async load_shader(gl: WebGL2RenderingContext) {
        this.shader = await ShaderProgram.load(
            gl,
            "polygon",
            polygon_vert_shader_src,
            polygon_frag_shader_src,
        );
    }

    /**
     * Create a new polygon set.
     * @param {WebGL2RenderingContext} gl
     * @param {ShaderProgram?} shader - optional override for the shader program used when drawing.
     */
    constructor(
        public gl: WebGL2RenderingContext,
        shader?: ShaderProgram,
    ) {
        this.shader = shader ?? PolygonSet.shader;
        this.vao = new VertexArray(gl);
        this.position_buf = this.vao.buffer(this.shader["a_position"], 2);
        this.color_buf = this.vao.buffer(this.shader["a_color"], 4);
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
     */
    static polyline_from_triangles(
        triangles: Float32Array,
        width: number,
        color: Color,
    ): Polyline[] {
        const lines: Polyline[] = [];
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
     */
    set(polygons: Polygon[]) {
        let total_vertex_data_length = 0;

        for (const polygon of polygons) {
            Tesselator.triangulate_polygon(polygon);
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
                polygon.color as Color,
                color_data_idx,
                polygon_vertex_count * 4,
            );
            color_data_idx += polygon_vertex_count * 4;
        }

        this.position_buf.set(vertex_data);
        this.color_buf.set(color_data);
        this.vertex_count = vertex_data_idx / 2;
    }

    render() {
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
export class PrimitiveSet implements IDisposable {
    #polygons: Polygon[] = [];
    #circles: Circle[] = [];
    #lines: Polyline[] = [];

    #polygon_set?: PolygonSet;
    #circle_set?: CircleSet;
    #polyline_set?: PolylineSet;

    /**
     * Load all shader programs required to render primitives.
     */
    static async load_shaders(gl: WebGL2RenderingContext) {
        await Promise.all([
            PolygonSet.load_shader(gl),
            PolylineSet.load_shader(gl),
            CircleSet.load_shader(gl),
        ]);
    }

    /**
     * Create a new primitive set
     */
    constructor(public gl: WebGL2RenderingContext) {
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
     * Clear committed geometry
     */
    clear() {
        this.#polygon_set?.dispose();
        this.#circle_set?.dispose();
        this.#polyline_set?.dispose();

        this.#polygon_set = undefined;
        this.#circle_set = undefined;
        this.#polyline_set = undefined;

        this.#polygons = [];
        this.#circles = [];
        this.#lines = [];
    }

    /**
     * Collect a new filled circle
     */
    add_circle(circle: Circle) {
        this.#circles.push(circle);
    }

    /**
     * Collect a new filled polygon
     */
    add_polygon(polygon: Polygon) {
        this.#polygons.push(polygon);
    }

    /**
     * Collect a new polyline
     */
    add_line(line: Polyline) {
        this.#lines.push(line);
    }

    /**
     * Tesselate all collected primitives and upload their data to the GPU.
     */
    commit() {
        if (this.#polygons.length) {
            this.#polygon_set = new PolygonSet(this.gl);
            this.#polygon_set.set(this.#polygons);
            this.#polygons = undefined!;
        }
        if (this.#lines.length) {
            this.#polyline_set = new PolylineSet(this.gl);
            this.#polyline_set.set(this.#lines);
            this.#lines = undefined!;
        }
        if (this.#circles.length) {
            this.#circle_set = new CircleSet(this.gl);
            this.#circle_set.set(this.#circles);
            this.#circles = undefined!;
        }
    }

    /**
     * Draw all the previously commit()ed primitives
     * @param matrix - complete view/projection matrix
     * @param depth - used for depth testing
     * @parama alpha - overrides the alpha for colors
     */
    render(matrix: Matrix3, depth = 0, alpha = 1) {
        if (this.#polygon_set) {
            this.#polygon_set.shader.bind();
            this.#polygon_set.shader["u_matrix"].mat3f(false, matrix.elements);
            this.#polygon_set.shader["u_depth"].f1(depth);
            this.#polygon_set.shader["u_alpha"].f1(alpha);
            this.#polygon_set.render();
        }

        if (this.#circle_set) {
            this.#circle_set.shader.bind();
            this.#circle_set.shader["u_matrix"].mat3f(false, matrix.elements);
            this.#circle_set.shader["u_depth"].f1(depth);
            this.#circle_set.shader["u_alpha"].f1(alpha);
            this.#circle_set.render();
        }

        if (this.#polyline_set) {
            this.#polyline_set.shader.bind();
            this.#polyline_set.shader["u_matrix"].mat3f(false, matrix.elements);
            this.#polyline_set.shader["u_depth"].f1(depth);
            this.#polyline_set.shader["u_alpha"].f1(alpha);
            this.#polyline_set.render();
        }
    }
}
