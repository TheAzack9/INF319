#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

out vec3 position;
out vec3 texCoord;
out vec2 properTexCoord;
out vec3 viewDir;
out vec3 layerPos;

uniform vec3 uEyePosition;
uniform float uOffset;
uniform vec3 uScaleVec;

void main() {
    vec3 viewDir = normalize(uEyePosition - vec3(0.5));

    //vec3 scaleX = (uScaleMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
    //vec3 scaleY = (uScaleMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
    //vec3 scaleZ = (uScaleMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;

    vec3 dir =  normalize(viewDir) / uScaleVec.z;
    vec3 xdir = normalize(cross(vec3(0.0, 1.0, 0.0), dir)) / uScaleVec.x;
    vec3 ydir = normalize(cross(dir, xdir)) / uScaleVec.y;

    float offset = uOffset - 0.5;
    vec2 tTexCoord = aTextureCoord - vec2(0.5);

    gl_Position = vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    properTexCoord = aTextureCoord;
    layerPos = vec3(aTextureCoord.x, aTextureCoord.y, uOffset);

    //texCoord = normalize(vec3(0.5) + dir * offset + xdir * tTexCoord.x + ydir * tTexCoord.y);
    texCoord = vec3(0.5, 0.5, 0.5) - xdir * tTexCoord.x + ydir * tTexCoord.y + dir * offset;
}