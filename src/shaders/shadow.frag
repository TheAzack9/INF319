#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 texCoord;
in vec3 position;
in vec2 properTexCoord;
in vec3 layerPos;

layout(location = 0) out lowp vec4 color;
layout(location = 1) out lowp vec4 shadowColor;

uniform sampler2D uPreviousBuffer;
uniform sampler2D uPreviousShadowBuffer;
uniform sampler3D uData;
uniform sampler2D uTransferFunction;

uniform vec2 center;
uniform vec2 scale;
uniform vec2 axes;

uniform int uIndex;
uniform float uOffset;

const float PI = 3.14159265359;

float rand(float n){return fract(sin(n) * 43758.5453123);}

float noise(float p){
	float fl = floor(p);
  float fc = fract(p);
	return mix(rand(fl), rand(fl + 1.0), fc);
}

float calculateShadowScattering() {
    
    float sum = 0.0;
    float fRand = rand(gl_FragCoord.x * 437.0 + gl_FragCoord.y * 27313.0 + gl_FragCoord.z * 984785.0);
    
    const int LIGHT_SAMPLES = 3;
    for(int i = 0; i < LIGHT_SAMPLES; ++i) {
        float fT = abs(fRand)  * 2.0 * PI + (PI * float(uIndex%LIGHT_SAMPLES) / float(LIGHT_SAMPLES)) + 2.0 * PI * (float(i) / float(LIGHT_SAMPLES));
        vec2 vecT = vec2(cos(fT), sin(fT));

        vec2 vecSample = vec2(1.0, 0.0);
        vecSample = vecT;
        vecSample *= scale;

        vec2 vecLightSampleOffset = vecSample.xx * axes.xy + vecSample.yy * axes.yx;
        vec2 vecLightSamplePoint = center.xy + vecLightSampleOffset.xy;

        vec4 lookup = vec4(properTexCoord * vec2(2.0) - vec2(1.0), 0.0, 1.0);
        lookup.xy += vecLightSamplePoint;
        //lookup.xy += center;
        lookup /= lookup.w;
        lookup.xy += vec2(1.0);
        lookup.xy *= 0.5;

        vec4 lookupColor = texture(uPreviousShadowBuffer, lookup.xy);
        sum += lookupColor.a;
    }
    return sum / float(3);
}

void main() {
    float weight = texture(uData, texCoord ).r;
    if(texCoord.x > 1.0 || texCoord.x < 0.0 || texCoord.y > 1.0 || texCoord.y < 0.0 || texCoord.z > 1.0 || texCoord.z < 0.0) weight = 0.0;
    vec4 prevColor = texture(uPreviousBuffer, properTexCoord);
    vec4 prevShadowColor = texture(uPreviousShadowBuffer, properTexCoord);
    if(prevColor.a >= 0.95) {
        color = prevColor;
        shadowColor = prevShadowColor;
        return;
    }

    vec4 transferColor = texture(uTransferFunction, vec2(weight, 0.5));
    //vec4 transferColor = vec4(weight);


    color = prevColor;

    float scatterAverage = calculateShadowScattering();
    vec4 shadowResult = clamp(vec4(transferColor.a + scatterAverage), vec4(0.0), vec4(1.0));
    shadowColor = shadowResult;

    color.rgb += (1.0 - color.a) * (transferColor.a * transferColor.rgb * (1.0 - prevShadowColor.a));
    color.a += (1.0 - color.a) * transferColor.a;
    
    

    
    //color.rgb *= prevShadowColor.r;
    //color = transferColor;
    //gl_FragDepth = position.z / 40.0;
}