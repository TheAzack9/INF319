#version 300 es

layout(location=0) in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform vec3 uEye;
uniform vec3 uUp;
uniform vec3 uLeft;
uniform float uOffset;
uniform float uAspect;
uniform mat4 uTest;

out vec3 texCoord;
out vec3 position;
out vec2 properTexCoord;
out vec3 vray_dir;

void main() {
    mat4 inv = uTest;

    vec3 texel = vec3(aTextureCoord.x, aTextureCoord.y, uOffset);
    vec3 dir = (inv * vec4(uEye, 0)).xyz;
    vec3 xdir = (inv * vec4(uLeft, 0)).xyz;
    vec3 ydir = (inv * vec4(uUp, 0)).xyz;

    float offset = uOffset - 0.5;
    vec2 tTexCoord = aTextureCoord - vec2(0.5);

    gl_Position = vec4(aVertexPosition, 1.0);
    position = gl_Position.xyz;
    properTexCoord = aTextureCoord;

    float dist = dot(tTexCoord, tTexCoord);
    vec3 ray_dir = vec3(tTexCoord.x, tTexCoord.y, sqrt(1.0 - dist));

    float testing = 1.0 / (1.0 - offset);

    //texCoord = normalize(vec3(0.5) + dir * offset + xdir * tTexCoord.x + ydir * tTexCoord.y);
    texCoord = vec3(0.5, 0.5, 0.5) - xdir * testing * ray_dir.x - ydir * ray_dir.y * testing - dir * offset * ray_dir.z;
    // texCoord = (inverse(uTest) * vec4(texCoord, 0.0)).xyz;

}