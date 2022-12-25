#version 300 es

uniform mat3 u_matrix;
in vec2 a_position;

void main() {
    gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);;
}
