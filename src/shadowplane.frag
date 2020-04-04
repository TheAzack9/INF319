#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 position;
in vec3 texCoord;
in vec2 properTexCoord;

out lowp vec4 color;

uniform sampler2D textureData;
uniform vec3 uEyePosition;
uniform sampler3D volumeData;
uniform int uIndex;

uniform vec2 uTextureSize;

void main() {
    //vec3 dir = normalize(texCoord);
    /*vec3 dir = clamp(texCoord, 0.0, 1.0);
    float alpha = texture(volumeData, dir).r;
    vec4 val_color = texture(textureData, properTexCoord);
    if(uIndex == 0) {
        val_color = vec4(0.0);
    }
    color.rgb = (alpha) *  vec3(0.0, 0.0, 1.0) / 40.0 + val_color.rgb;
    color.a = alpha / 40.0 + val_color.a;*/

    if(uIndex == 0) {
        color = vec4(1.0);
        return;
    }
    vec4 c= texelFetch(textureData, ivec2(properTexCoord * uTextureSize) + ivec2( 0.0,  0.0), 0);
    vec4 u= texelFetch(textureData, ivec2(properTexCoord * uTextureSize) + ivec2(-20.0,  0.0), 0);
    vec4 l= texelFetch(textureData, ivec2(properTexCoord * uTextureSize) + ivec2( 0.0, -20.0), 0);
    color = c * 0.0 + (u+l) / 2.0 * 0.75;

    //color = vec4(0.0, 0.0, 1.0, 1.0) * alpha;
    //color = vec4(properTexCoord.rg, 0.0, 1.0);
    //color += val_color;
    //color = vec4(texCoord / 2.0 + 0.5, 1.0);
    //color = vec4(dir.r, dir.g, dir.b, 1.0);
}