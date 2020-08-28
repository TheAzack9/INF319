#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 texCoord;
in vec3 position;
in vec2 properTexCoord;

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

uniform float uMidaFactor;
uniform float uMidaShadowFactor;
uniform int uMidaMethod;

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
        sum += lookupColor.r;
    }
    return sum / float(3);
}

//https://github.com/CesiumGS/cesium/blob/master/Source/Shaders/Builtin/Functions/luminance.glsl
float czm_luminance(vec3 rgb)
{
    // Algorithm from Chapter 10 of Graphics Shaders.
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    return dot(rgb, W);
}

void main() {
    float weight = texture(uData, texCoord ).r;
    if(texCoord.x >= 0.99 || texCoord.x <= 0.01 || texCoord.y >= 0.99 || texCoord.y <= 0.01 || texCoord.z >= 0.99 || texCoord.z <= 0.01) weight = 0.0;
    vec4 prevColor = texture(uPreviousBuffer, properTexCoord);
    vec4 prevShadowColor = texture(uPreviousShadowBuffer, properTexCoord);
    float prevShadowWeight = prevShadowColor.r;
    float prevMax = prevShadowColor.g;

    float luminance = czm_luminance(prevColor.rgb);

    float midaDelta = 1.0;
    float midaShadowDelta = 0.0;
    if(weight > prevMax) {

        if(uMidaMethod == 0) {
            midaDelta = 1.0 - (weight - prevMax) * uMidaFactor;
            midaShadowDelta = (weight-prevMax)*uMidaShadowFactor;
        }
        else if(uMidaMethod == 1) {
            midaDelta = 1.0 - (weight - prevMax) * uMidaFactor;
            midaShadowDelta = (weight-prevMax)*uMidaShadowFactor;
        }
        else if(uMidaMethod == 2) {
            // midaDelta = 1.0 - (weight - prevMax) * uMidaFactor;
            // midaShadowDelta = (weight-prevMax)*uMidaShadowFactor * (luminance);
            
            midaDelta = 1.0 - (weight - prevMax) * uMidaFactor;
            midaShadowDelta = (weight-prevMax)*(uMidaShadowFactor * uMidaFactor);
        }
        else if(uMidaMethod == 3) {
            midaDelta = 1.0 - (weight - prevMax) * uMidaFactor;
            midaShadowDelta = (weight-prevMax)*(uMidaShadowFactor + uMidaFactor);
        }
    }


    vec4 transferColor = texture(uTransferFunction, vec2(weight, 0.5));
    //vec4 transferColor = vec4(weight);
    transferColor.a /= 4.0;

    color = prevColor;

    float scatterAverage = calculateShadowScattering();
    float shadowResult = clamp(transferColor.a + scatterAverage - midaShadowDelta, 0.0, 1.0);
    shadowColor = vec4(shadowResult, max(prevMax, weight), 0.0, 0.0);

    color.rgb = midaDelta * color.rgb + (1.0 - midaDelta * color.a) * (transferColor.a * transferColor.rgb  * (1.0 - prevShadowWeight * (1.0-midaShadowDelta)));
    color.a = midaDelta * color.a + (1.0 - midaDelta * color.a) * transferColor.a;
    
    

    
    //color.rgb *= prevShadowColor.r;
    //color = transferColor;
    //gl_FragDepth = position.z / 40.0;
}