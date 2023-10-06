/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { IDisposable } from "../../base/disposable";
import { is_string } from "../../base/types";

/**
 * Basic helpers for interacting with WebGL2
 */

type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any
    ? R
    : never;

/**
 * Encapsulates a shader uniform, making it easier to set values.
 *
 * @example
 * u_color = new Uniform(gl, "u_color", u_color_location);
 * u_color.f4(1, 0, 1, 1);
 *
 */
class Uniform {
    constructor(
        public gl: WebGL2RenderingContext,
        public name: string,
        public location: WebGLUniformLocation,
        public type: GLenum,
    ) {}

    f1(x: number) {
        this.gl.uniform1f(this.location, x);
    }
    f1v(data: Float32List, srcOffset?: GLuint, srcLength?: GLuint) {
        this.gl.uniform1fv(this.location, data, srcOffset, srcLength);
    }
    f2(...args: ParametersExceptFirst<WebGLRenderingContextBase["uniform2f"]>) {
        this.gl.uniform2f(this.location, ...args);
    }
    f2v(...args: ParametersExceptFirst<WebGL2RenderingContext["uniform2fv"]>) {
        this.gl.uniform2fv(this.location, ...args);
    }
    f3(...args: ParametersExceptFirst<WebGL2RenderingContext["uniform3f"]>) {
        this.gl.uniform3f(this.location, ...args);
    }
    f3v(...args: ParametersExceptFirst<WebGL2RenderingContext["uniform3fv"]>) {
        this.gl.uniform3fv(this.location, ...args);
    }
    f4(...args: ParametersExceptFirst<WebGL2RenderingContext["uniform4f"]>) {
        this.gl.uniform4f(this.location, ...args);
    }
    f4v(...args: ParametersExceptFirst<WebGL2RenderingContext["uniform4fv"]>) {
        this.gl.uniform4fv(this.location, ...args);
    }
    mat3f(
        ...args: ParametersExceptFirst<
            WebGL2RenderingContext["uniformMatrix3fv"]
        >
    ) {
        this.gl.uniformMatrix3fv(this.location, ...args);
    }
    mat3fv(
        ...args: ParametersExceptFirst<
            WebGL2RenderingContext["uniformMatrix3fv"]
        >
    ) {
        this.gl.uniformMatrix3fv(this.location, ...args);
    }
}

/**
 * A shader program consisting of a vertex shader, fragment shader, and uniforms.
 */
export class ShaderProgram {
    static #shader_cache: WeakMap<
        WebGL2RenderingContext,
        Map<string, ShaderProgram>
    > = new WeakMap();

    program: WebGLProgram;

    /** Shader uniforms */
    uniforms: Record<string, Uniform> = {};

    /** Shader attributes */
    attribs: Record<string, WebGLActiveInfo> = {};

    /**
     * Create and compile a shader program
     * @param name - used for caching and identifying the shader
     * @param vertex - vertex shader source code
     * @param fragment - fragment shader source code
     */
    constructor(
        public gl: WebGL2RenderingContext,
        public name: string,
        public vertex: WebGLShader,
        public fragment: WebGLShader,
    ) {
        if (is_string(vertex)) {
            vertex = ShaderProgram.compile(gl, gl.VERTEX_SHADER, vertex);
        }
        this.vertex = vertex;

        if (is_string(fragment)) {
            fragment = ShaderProgram.compile(gl, gl.FRAGMENT_SHADER, fragment);
        }
        this.fragment = fragment;

        this.program = ShaderProgram.link(gl, vertex, fragment);

        this.#discover_uniforms();
        this.#discover_attribs();
    }

    // TODO: Consider moving uniforms into typesafe container
    [key: string]: any | Uniform;

    /**
     * Load vertex and fragment shader sources from URLs and compile them
     * into a new ShaderProgram
     * @param name used for caching and identifying the shader.
     */
    static async load(
        gl: WebGL2RenderingContext,
        name: string,
        vert_src: URL | string,
        frag_src: URL | string,
    ): Promise<ShaderProgram> {
        let cache = ShaderProgram.#shader_cache.get(gl);
        if (!cache) {
            cache = new Map();
            ShaderProgram.#shader_cache.set(gl, cache);
        }

        if (!cache.has(name)) {
            if (vert_src instanceof URL) {
                vert_src = await (await fetch(vert_src)).text();
            }
            if (frag_src instanceof URL) {
                frag_src = await (await fetch(frag_src)).text();
            }

            const prog = new ShaderProgram(gl, name, vert_src, frag_src);

            cache.set(name, prog);
        }

        return cache.get(name) as ShaderProgram;
    }

    /**
     * Compiles a shader
     *
     * Typically not used directly, use load() instead.
     *
     * @param gl
     * @param type - gl.FRAGMENT_SHADER or gl.VERTEX_SHADER
     * @param source
     */
    static compile(gl: WebGL2RenderingContext, type: GLenum, source: string) {
        const shader = gl.createShader(type);

        if (shader == null) {
            throw new Error("Could not create new shader");
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        }

        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);

        throw new Error(`Error compiling ${type} shader: ${info}`);
    }

    /**
     * Link a vertex and fragment shader into a shader program.
     *
     * Typically not used directly, use load() instead.
     */
    static link(
        gl: WebGL2RenderingContext,
        vertex: WebGLShader,
        fragment: WebGLShader,
    ) {
        const program = gl.createProgram();

        if (program == null) {
            throw new Error("Could not create new shader program");
        }

        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return program;
        }

        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);

        throw new Error(`Error linking shader program: ${info}`);
    }

    #discover_uniforms() {
        this.uniforms = {};
        for (
            let u_n = 0;
            u_n <
            this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
            u_n++
        ) {
            const info = this.gl.getActiveUniform(this.program, u_n);

            if (info == null) {
                throw new Error(
                    `Could not get uniform info for uniform number ${u_n} for program ${this.program}`,
                );
            }

            const location = this.gl.getUniformLocation(
                this.program,
                info.name,
            );

            if (location == null) {
                throw new Error(
                    `Could not get uniform location for uniform number ${u_n} for program ${this.program}`,
                );
            }

            this[info.name] = this.uniforms[info.name] = new Uniform(
                this.gl,
                info.name,
                location,
                info.type,
            );
        }
    }

    #discover_attribs() {
        this.attribs = {};
        for (
            let a_n = 0;
            a_n <
            this.gl.getProgramParameter(
                this.program,
                this.gl.ACTIVE_ATTRIBUTES,
            );
            a_n++
        ) {
            const info = this.gl.getActiveAttrib(this.program, a_n);

            if (info == null) {
                throw new Error(
                    `Could not get attribute info for attribute number ${a_n} for program ${this.program}`,
                );
            }

            this.attribs[info.name] = info;
            this[info.name] = this.gl.getAttribLocation(
                this.program,
                info.name,
            );
        }
    }

    /** use this shader for drawing */
    bind() {
        this.gl.useProgram(this.program);
    }
}

/**
 * Manages vertex array objects (VAOs) and associated buffers.
 */
export class VertexArray implements IDisposable {
    vao?: WebGLVertexArrayObject;
    buffers: Buffer[] = [];

    /**
     * Create a VertexArray
     * @param {WebGL2RenderingContext} gl
     */
    constructor(public gl: WebGL2RenderingContext) {
        this.gl = gl;

        const vao = this.gl.createVertexArray();
        if (!vao) {
            throw new Error(`Could not create new VertexArray`);
        }
        this.vao = vao;

        this.bind();
    }

    /**
     * Free WebGL resources
     * @param include_buffers
     */
    dispose(include_buffers = true) {
        this.gl.deleteVertexArray(this.vao ?? null);
        this.vao = undefined;

        if (include_buffers) {
            for (const buf of this.buffers) {
                buf.dispose();
            }
        }
    }

    bind() {
        this.gl.bindVertexArray(this.vao!);
    }

    /**
     * Create a new buffer bound to this vertex array
     * @param attrib - shader attribute location
     * @param size - number of components per vertex attribute
     * @param type - data type for each component, if unspecified it's gl.FLOAT.
     * @param normalized - whether or not to normalize integer types when converting to float
     * @param stride - offset between consecutive attributes
     * @param offset - offset from the beginning of the array to the first attribute
     * @param target - binding point, typically gl.ARRAY_BUFFER (the default if unspecified)
     *      or gl.ELEMENT_ARRAY_BUFFER
     */
    buffer(
        attrib: GLint,
        size: GLint,
        type?: GLenum,
        normalized: GLboolean = false,
        stride: GLsizei = 0,
        offset: GLintptr = 0,
        target?: GLenum,
    ): Buffer {
        type ??= this.gl.FLOAT;

        const b = new Buffer(this.gl, target);

        b.bind();
        this.gl.vertexAttribPointer(
            attrib,
            size,
            type,
            normalized,
            stride,
            offset,
        );
        this.gl.enableVertexAttribArray(attrib);

        this.buffers.push(b);

        return b;
    }
}

export type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;

export type TypedArrayLike =
    | TypedArray
    | DataView
    | ArrayBuffer
    | SharedArrayBuffer;

/**
 * Manages a buffer of GPU data like vertices or colors
 */
export class Buffer implements IDisposable {
    #buf?: WebGLBuffer;
    target: GLenum;

    /**
     * Create a new buffer
     * @param target - binding point, typically gl.ARRAY_BUFFER (the default if unspecified)
     *      or gl.ELEMENT_ARRAY_BUFFER
     */
    constructor(
        public gl: WebGL2RenderingContext,
        target?: GLenum,
    ) {
        this.gl = gl;
        this.target = target ?? gl.ARRAY_BUFFER;

        const buf = gl.createBuffer();
        if (!buf) {
            throw new Error("Unable to create new Buffer");
        }

        this.#buf = buf;
    }

    dispose() {
        if (this.#buf) {
            this.gl.deleteBuffer(this.#buf);
        }
        this.#buf = undefined;
    }

    /**
     * Binds the buffer to the current context
     */
    bind() {
        this.gl.bindBuffer(this.target, this.#buf!);
    }

    /**
     * Uploads data to the GPU buffer
     *
     * @param usage - intended usage pattern, typically gl.STATIC_DRAW
     *      (the default if unspecified) or gl.DYNAMIC_DRAW
     */
    set(data: TypedArrayLike, usage?: GLenum) {
        this.bind();
        usage ??= this.gl.STATIC_DRAW;
        this.gl.bufferData(this.target, data, usage);
    }

    /**
     * Gets the length of the buffer as reported by WebGL.
     */
    get length(): number {
        this.bind();
        return this.gl.getBufferParameter(
            this.target,
            this.gl.BUFFER_SIZE,
        ) as number;
    }
}
