#version 300 es

uniform mat3 u_matrix;
in vec2 a_position;
in vec2 a_linespace;
in float a_cap_region;
out vec2 v_linespace;
out float v_cap_region;

void main() {
    gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);;
    v_linespace = a_linespace;
    v_cap_region = a_cap_region;
}
