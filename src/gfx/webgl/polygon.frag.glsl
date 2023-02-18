#version 300 es

precision highp float;

uniform float u_depth;
uniform float u_alpha;

in vec4 v_color;

out vec4 o_color;

void main() {
    vec4 i_color = v_color;
    i_color.a *= u_alpha;
    o_color = i_color;
    gl_FragDepth = u_depth;
}
