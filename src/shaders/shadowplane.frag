#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;

in vec3 position;
in vec3 texCoord;
in vec2 properTexCoord;
in vec3 viewDir;

layout(location = 0) out lowp vec4 color;
layout(location = 1) out lowp vec4 occlusionColor;

uniform sampler2D previousOpacityBuffer;
uniform sampler2D previousColorBuffer;
uniform vec3 uEyePosition;
uniform sampler3D volumeData;
uniform int uIndex;
uniform int layers;

uniform vec2 uTextureSize;

uniform vec3 lowValColor;
uniform vec3 highValColor;

const float lightAngle = 3.1415/2.0*0.0;

const float coeff = 1.0;

void main() {

    /*vec3 viewDir = normalize(uEyePosition - vec3(0.5));
    vec3 lightPosition = uEyePosition + vec3(5.0, 0.0, 0.0);
    vec3 lightDir = normalize(lightPosition - vec3(0.5));*/
    
    vec4 val_color = texture(previousColorBuffer, properTexCoord);


    vec3 dir = texCoord;

    float val = texture(volumeData, dir).r;
    if(dir.x > 1.0 || dir.x < 0.0 || dir.y > 1.0 || dir.y < 0.0 || dir.z > 1.0 || dir.z < 0.0) val = 0.0;

        float zDistance = 1.0/float(layers);

    if(uIndex == 0) {
        occlusionColor.r = 1.0;
        color = vec4(0.0);
        return;
    } else {

        ivec2 location = ivec2(properTexCoord * uTextureSize);

        ivec2 previousLocation = location + ivec2(vec2(properTexCoord) * vec2(cos(lightAngle), sin(lightAngle)) * 0.0  * vec2(zDistance) * uTextureSize);

        float c= texelFetch(previousOpacityBuffer, previousLocation + ivec2( 0.0,  0.0), 0).r;
        float u= texelFetch(previousOpacityBuffer, previousLocation + ivec2(-1.0,  0.0), 0).r;
        float d= texelFetch(previousOpacityBuffer, previousLocation + ivec2(1.0,  0.0), 0).r;
        float l= texelFetch(previousOpacityBuffer, previousLocation + ivec2( 0.0, -1.0), 0).r;
        float r= texelFetch(previousOpacityBuffer, previousLocation + ivec2( 0.0, 1.0), 0).r;
        occlusionColor.r = (c + (u+d+l+r)) / 5.0 - zDistance;
    }

    vec4 opacity = occlusionColor;
    if(uIndex == 0) {
        val_color = vec4(0.0);
    }

    vec4 theColor = vec4(normalize(lowValColor), 0.0);
    if(val > 0.4) {
        theColor = vec4(normalize(highValColor), 1.0);
    } else if(val > 0.21){
        theColor = vec4(normalize(lowValColor), 1.0/float(layers/2));
    }

    //float alpha = opacity.r;
    float alpha = theColor.a;
    color.rgb = alpha *  theColor.rgb * (1.0 - occlusionColor.r) / coeff + val_color.rgb * (1.0 - alpha);
    color.a = alpha * (1.0 - occlusionColor.r)  / coeff + val_color.a;

}