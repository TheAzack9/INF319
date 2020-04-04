#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

out vec3 position;
out vec3 texCoord;
out vec2 properTexCoord;

uniform vec3 uEyePosition;
uniform float uOffset;

void main() {
    vec3 viewDir = normalize(uEyePosition - vec3(0.5));

    vec3 dir = normalize(viewDir);
    vec3 xdir = normalize(cross(vec3(0.0, 1.0, 0.0), dir));
    vec3 ydir = normalize(cross(dir, xdir));

    float offset = uOffset - 0.5;
    vec2 tTexCoord = aTextureCoord - vec2(0.5);

    gl_Position = vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    properTexCoord = aTextureCoord;

    //texCoord = normalize(vec3(0.5) + dir * offset + xdir * tTexCoord.x + ydir * tTexCoord.y);
    texCoord = vec3(0.5, 0.5, 0.5) - xdir * tTexCoord.x + ydir * tTexCoord.y + dir * offset;
}