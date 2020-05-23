#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;

in vec3 position;
in vec3 texCoord;
in vec2 properTexCoord;
in vec3 viewDir;
in vec3 layerPos;

layout(location = 0) out lowp vec4 color;
layout(location = 1) out lowp vec4 occlusionColor;

uniform sampler2D previousOpacityBuffer;
uniform sampler2D previousColorBuffer;
uniform vec3 uEyePosition;
uniform sampler3D volumeData;
uniform int uIndex;
uniform int layers;
uniform float uOffset;

uniform vec2 uTextureSize;

uniform vec3 lowValColor;
uniform vec3 highValColor;

uniform float softness;
uniform float elevation;
uniform float azimuth;
uniform float rotation;

const float lightAngle = 3.1415/2.0*0.0;
const float PI = 3.14159265359;

const float coeff = 1.0;

float rand(float n){return fract(sin(n) * 43758.5453123);}

float noise(float p){
	float fl = floor(p);
  float fc = fract(p);
	return mix(rand(fl), rand(fl + 1.0), fc);
}

void main() {

    /*vec3 viewDir = normalize(uEyePosition - vec3(0.5));
    vec3 lightPosition = uEyePosition + vec3(5.0, 0.0, 0.0);
    vec3 lightDir = normalize(lightPosition - vec3(0.5));*/
    
    vec4 val_color = texture(previousColorBuffer, properTexCoord);


    vec3 dir = texCoord;

    float val = texture(volumeData, dir).r;
    if(dir.x > 1.0 || dir.x < 0.0 || dir.y > 1.0 || dir.y < 0.0 || dir.z > 1.0 || dir.z < 0.0) val = 0.0;

    if(uIndex == 0) {
        val_color = vec4(0.0);
    }
        float zDistance = 1.0/float(layers);

    vec4 theColor = vec4(lowValColor, 0.0);
    if(val > 0.4) {
        theColor = vec4(highValColor, 1.0);
    } else if(val > 0.21){
        theColor = vec4(lowValColor, 0.0 / float(layers/8));
    }


    float opacity = 0.0;

        ivec2 location = ivec2(properTexCoord * uTextureSize);

        /*ivec2 previousLocation = location + ivec2(vec2(properTexCoord) * vec2(cos(lightAngle), sin(lightAngle)) * 0.0  * vec2(zDistance) * uTextureSize);

        float c= texelFetch(previousOpacityBuffer, previousLocation + ivec2( 0.0,  0.0), 0).r;
        float u= texelFetch(previousOpacityBuffer, previousLocation + ivec2(-1.0,  0.0), 0).r;
        float d= texelFetch(previousOpacityBuffer, previousLocation + ivec2(1.0,  0.0), 0).r;
        float l= texelFetch(previousOpacityBuffer, previousLocation + ivec2( 0.0, -1.0), 0).r;
        float r= texelFetch(previousOpacityBuffer, previousLocation + ivec2( 0.0, 1.0), 0).r;
        occlusionColor.r = (c + (u+d+l+r)) / 5.0 - zDistance;*/


    const float ratioXY = 0.5;
    const float a = ratioXY;
    const float b = 1.0 - ratioXY;

    float fVarX = a * softness;
    float fVarY = b * softness;

    float fZ = sin(elevation);
    float fHyp = cos(elevation);
    float fY = fHyp * cos(azimuth);
    float fX = fHyp * sin(azimuth);
    
    float fdX = (fX/fZ);
    float fdY = (fY / fZ);

    // No perspective

    vec2 center = vec2(fdX * zDistance, fdY * zDistance);
    vec2 scale = vec2(fVarX * sqrt(zDistance), fVarY * sqrt(zDistance));
    vec2 axes = vec2(sin(rotation), cos(rotation));

    float theta = acos(axes.x);
    float sum = 0.0;
    float fRand = rand(gl_FragCoord.x * 437985.0 + gl_FragCoord.y * 2713.0 + gl_FragCoord.z * 98475.0);
    
    const int LIGHT_SAMPLES = 3;
    for(int i = 0; i < LIGHT_SAMPLES; ++i) {
        float fT = fRand * 2.0 * PI + (PI * float(uIndex%LIGHT_SAMPLES) / float(LIGHT_SAMPLES)) + 2.0 * PI * (float(i) / float(LIGHT_SAMPLES));
        vec2 vecT = vec2(cos(fT), sin(fT));

        vec2 vecSample = vec2(1.0, 0.0);
        vecSample = vecSample.xx * vec2(1.0, 1.0) * vecT.xy + vecSample.yy * vec2(-1.0, 1.0) * vecT.yx;
        vecSample *= scale;

        vec2 vecLightSampleOffset = vecSample.xx * vec2(1.0, 1.0) * axes.xy + vecSample.yy * vec2(-1.0, 1.0) * axes.yx;
        vec2 vecLightSamplePoint = center.xy + vecLightSampleOffset.xy;

        vec4 lookup = vec4(properTexCoord * vec2(2.0) - vec2(1.0), 0.0, 1.0);
        lookup.xy += vecLightSamplePoint;
        //lookup.xy += center;
        lookup /= lookup.w;
        lookup.xy += vec2(1.0);
        lookup.xy *= 0.5;

        vec4 lookupColor = texture(previousOpacityBuffer, lookup.xy);
        sum += lookupColor.r;
    }
    sum /= float(LIGHT_SAMPLES);
    opacity = sum;
        vec4 lookupColor = texture(previousOpacityBuffer, properTexCoord);
        occlusionColor.r = opacity * (1.0 - theColor.a);
       // occlusionColor.r = opacity + (1.0 - theColor.a);
        
    if(uIndex == layers-1 || dir.y <= 0.01) {
        theColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
        /*opacity = 1.0 - (1.0 - opacity) * 0.7;
        //occlusionColor.rgb = layerPos;


        /*vec4 lookup = vec4(position, 1.0);
        lookup.xy += vec2(fdX * sampleDistance, fdY * sampleDistance);
        lookup /= lookup.w;
        lookup.xy += vec2(1.0);
        lookup.xy *= 0.5;

        vec4 lookupColor = texture(previousOpacityBuffer, vec2(1.0) - lookup.xy);
        
        occlusionColor.r = lookupColor.r - (theColor.a);*/
        
/*
        float x = lookup.x - 0.5;
        float y = lookup.y - 0.5;

        float cx = x/a;
        float cy = y/b;
        float intensity = b/a*sqrt(a*a-x*x);
        occlusionColor.r = cx*cx + cy*cy;*/
        //color = vec4(vec2(1.0) - lookup.xy, 0.0, 1.0);

    //float opacity = occlusionColor.r;
    //float alpha = opacity.r;
    float alpha = 1.0 - val_color.a;
    color.rgb = (alpha * opacity * theColor.rgb + (val_color.rgb * (1.0 - alpha)));
    color.a = val_color.a + theColor.a;
    //color.rgb = vec3(opacity);

}