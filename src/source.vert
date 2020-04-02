#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec4 aColorPosition;

uniform mat4 uProjectionMatrix;
uniform vec3 uEyePosition;

out vec3 vray_dir;
out vec3 position;
flat out vec3 transformed_eye;

void main() {

    gl_Position = uProjectionMatrix * vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    transformed_eye = uEyePosition;
    vray_dir = aVertexPosition - transformed_eye;

}