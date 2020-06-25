#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform vec3 uEye;
uniform vec3 uScale;
uniform float uOffset;

out vec3 texCoord;
out vec3 position;
out vec2 properTexCoord;
out vec3 layerPos;

void main() {
    vec3 viewDir = normalize(vec3(0.5) - uEye);

    vec3 dir = viewDir / uScale.z;
    vec3 xdir = normalize(cross(vec3(0.0, 1.0, 0.0), dir)) / uScale.x;
    vec3 ydir = normalize(cross(dir, xdir)) / uScale.y;

    float offset = uOffset - 0.5;
    vec2 tTexCoord = aTextureCoord - vec2(0.5);

    gl_Position = vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    properTexCoord = aTextureCoord;
    layerPos = vec3(aTextureCoord.x, aTextureCoord.y, uOffset);

    //texCoord = normalize(vec3(0.5) + dir * offset + xdir * tTexCoord.x + ydir * tTexCoord.y);
    texCoord = vec3(0.5, 0.5, 0.5) - xdir * tTexCoord.x + ydir * tTexCoord.y + dir * offset;

}