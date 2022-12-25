#version 300 es

precision highp float;

uniform vec4 u_color;
in vec2 v_linespace;
in float v_cap_region;

out vec4 outColor;

void main() {
    float v = abs(v_linespace.x);
    float x = v_linespace.x;
    float y = v_linespace.y;

    if(x < (-1.0 + v_cap_region)) {
        float a = (1.0 + x) / v_cap_region;
        x = mix(-1.0, 0.0, a);
        if(x * x + y * y < 1.0) {
            outColor = u_color;
        } else {
            discard;
        }
    } else if (x > (1.0 - v_cap_region)) {
        float a = (x - (1.0 - v_cap_region)) / v_cap_region;
        x = mix(0.0, 1.0, a);
        if(x * x + y * y < 1.0) {
            outColor = u_color;
        } else {
            discard;
        }
    } else {
        outColor = u_color;
    }
}
