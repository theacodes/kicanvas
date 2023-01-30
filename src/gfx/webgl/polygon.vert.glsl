#version 300 es

uniform mat3 u_matrix;
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;

void main() {
    v_color = a_color;
    gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);;
}
