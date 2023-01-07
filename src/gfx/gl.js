/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

class Uniform {
    static _function_map = {
        f1: "uniform1f",
        f1v: "uniform1fv",
        f2: "uniform2f",
        f2v: "uniform2fv",
        f3: "uniform3f",
        f3v: "uniform3fv",
        f4: "uniform4f",
        f4v: "uniform4fv",
        mat3f: "uniformMatrix3fv",
        mat3fv: "uniformMatrix3fv",
        // TODO: This is incomplete
        // TODO: I can also figure this out from the type
    };

    constructor(gl, name, location, type) {
        this.gl = gl;
        this.name = name;
        this.location = location;
        this.type = type;

        for (const [dst, src] of Object.entries(
            this.constructor._function_map
        )) {
            this[dst] = (...args) => {
                this.gl[src](this.location, ...args);
            };
        }
    }
}

export class ShaderProgram {
    static #shader_cache = {};

    constructor(gl, vertex, fragment) {
        this.gl = gl;

        if (typeof vertex === "string") {
            vertex = this.constructor.compile(gl, gl.VERTEX_SHADER, vertex);
        }
        this.vertex = vertex;

        if (typeof fragment === "string") {
            fragment = this.constructor.compile(
                gl,
                gl.FRAGMENT_SHADER,
                fragment
            );
        }
        this.fragment = fragment;

        this.program = this.constructor.link(gl, vertex, fragment);

        this.discover_uniforms();
        this.discover_attribs();
    }

    static async load(gl, name, vert_url, frag_url) {
        if (!this.#shader_cache[name]) {
            const vert = await (
                await fetch(new URL(vert_url, import.meta.url))
            ).text();
            const frag = await (
                await fetch(new URL(frag_url, import.meta.url))
            ).text();
            this.#shader_cache[name] = new ShaderProgram(gl, vert, frag);
        }

        return this.#shader_cache[name];
    }

    static compile(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        }

        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);

        throw new Error(`Error compiling ${type} shader: ${info}`);
    }

    static link(gl, vertex, fragment) {
        const program = gl.createProgram();
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

    discover_uniforms() {
        this.uniforms = {};
        for (
            let u_n = 0;
            u_n <
            this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
            u_n++
        ) {
            const info = this.gl.getActiveUniform(this.program, u_n);
            info.n = u_n;
            info.location = this.gl.getUniformLocation(this.program, info.name);

            this.uniforms[info.name] = info;
            this[info.name] = new Uniform(
                this.gl,
                info.name,
                info.location,
                info.type
            );
        }
    }

    discover_attribs() {
        this.attribs = {};
        for (
            let a_n = 0;
            a_n <
            this.gl.getProgramParameter(
                this.program,
                this.gl.ACTIVE_ATTRIBUTES
            );
            a_n++
        ) {
            const info = this.gl.getActiveAttrib(this.program, a_n);
            info.n = a_n;
            this.attribs[info.name] = info;
            this[info.name] = this.gl.getAttribLocation(
                this.program,
                info.name
            );
        }
    }

    bind() {
        this.gl.useProgram(this.program);
    }
}

export class VertexArray {
    constructor(gl) {
        this.gl = gl;
        this.vao = this.gl.createVertexArray();
        this.bind();
    }

    dispose() {
        this.gl.deleteVertexArray(this.vao);
    }

    bind() {
        this.gl.bindVertexArray(this.vao);
    }

    buffer(
        attrib,
        size,
        type = null,
        normalized = false,
        stride = 0,
        offset = 0
    ) {
        type ??= this.gl.FLOAT;
        const b = new Buffer(this.gl);

        b.bind();
        this.gl.vertexAttribPointer(
            attrib,
            size,
            type,
            normalized,
            stride,
            offset
        );
        this.gl.enableVertexAttribArray(attrib);

        return b;
    }
}

export class Buffer {
    constructor(gl) {
        this.gl = gl;
        this.buf = gl.createBuffer();
    }

    dispose() {
        this.gl.deleteBuffer(this.buf);
    }

    bind(target = null) {
        target ??= this.gl.ARRAY_BUFFER;
        this.target = target;
        this.gl.bindBuffer(target, this.buf);
    }

    set(data, usage = null, target = null) {
        this.bind(target);
        usage ??= this.gl.STATIC_DRAW;
        this.gl.bufferData(this.target, data, usage);
    }

    length(target = null) {
        target ??= this.gl.ARRAY_BUFFER;
        this.bind(target);
        return this.gl.getBufferParameter(target, this.gl.BUFFER_SIZE);
    }
}
