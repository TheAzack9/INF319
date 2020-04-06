#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

out vec3 position;
out vec2 texCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {

    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    texCoord = aTextureCoord;
}