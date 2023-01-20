#version 300 es

uniform mat3 u_matrix;

in vec2 a_position;
in vec4 a_color;
in float a_cap_region;

out vec2 v_linespace;
out float v_cap_region;
out vec4 v_color;

vec2 c_linespace[6] = vec2[](
    // first triangle
    vec2(-1, -1),
    vec2( 1, -1),
    vec2(-1,  1),
    // second triangle
    vec2(-1,  1),
    vec2( 1, -1),
    vec2( 1,  1)
);

void main() {
    int triangle_vertex_num = int(gl_VertexID % 6);

    v_linespace = c_linespace[triangle_vertex_num];
    v_cap_region = a_cap_region;

    gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);

    v_color = a_color;
}
