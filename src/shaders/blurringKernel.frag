#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 position;
in vec2 texCoord;

out lowp vec4 color;

const float PI = 3.14159265359;

const float thetaAngle = 40.0 / 180.0 * PI;
const float alpha = 37.0 / 180.0 * PI;
const float layer_distance = 1.0/257.0;

void main() {

    /*float R = layer_distance * tan(thetaAngle) / cos(alpha);
    float a_1 = R * sin(PI/2.0 - thetaAngle) / sin(PI/2.0 + thetaAngle - alpha);
    float a_2 = R * sin(PI/2.0 + thetaAngle) / sin(PI/2.0 - thetaAngle - alpha);
    float A = (a_1+a_2) / 2.0;

    float OC = abs((a_2 - a_1) / 2.0);
    
    //float d_prime = sin(alpha) * OC;
    float d_prime = sin(alpha) * OC;
    float R_prime = R + layer_distance * R;
    float B = sqrt(R_prime*R_prime - OC*OC + d_prime * d_prime);

    mat2 rotation = mat2(cos(alpha), -sin(alpha), sin(alpha), cos(alpha));

    vec2 position = /*rotation   ((texCoord - 0.5) * 2.0);
    float x = position.x;
    float y = position.y;

    float k_C = x*x - 2.0*OC + OC * OC + y*y * A*A / (B*B);
    float k_B = -2.0*OC * (1.0 + OC);
    float k_A = OC*OC - A*A;

    float k_1 = (-k_B + sqrt(k_B*k_B - 4.0*k_A*k_C)) / (2.0*k_A);
    float k_2 = (-k_B - sqrt(k_B*k_B - 4.0*k_A*k_C)) / (2.0*k_A);

    float k = max(k_1, k_2);
    float weight = 1.0 - k;


    color = vec4(weight);*/

    //color = vec4(1.0 - b/a*sqrt(a*a-x*x));

    const float softness = 1.0;
    const float elevation = PI/8.0;
    const float azimuth = PI / 4.0;
    const float rotation = PI/4.0;
    const float sampleDistance = 1.0/257.0;

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

    vec2 center = vec2(fdX * sampleDistance, fdY * sampleDistance);
    vec2 scale = vec2(fVarX * sqrt(sampleDistance), fVarY * sqrt(sampleDistance));
    vec2 axes = vec2(sin(rotation), cos(rotation));


    // Global light
    /*vec4 lookup = vec4(position, 1.0);
    lookup.xy += vec2(fdX * sampleDistance, fdY * sampleDistance);
    lookup /= lookup.w;
    lookup.xy += vec2(1.0);
    lookup.xy *= 0.5;

    color = vec4(lookup.xy, 0.0, 1.0);
    
    

    float x = lookup.x - 0.5;
    float y = lookup.y - 0.5;

    float cx = x/a;
    float cy = y/b;
    float intensity = b/a*sqrt(a*a-x*x);
    color = vec4((1.0 - (cx*cx + cy*cy)));
    */

    // Local light
    float theta = acos(axes.x);
    float sum = 0.0;

    const int LIGHT_SAMPLES = 2;
    for(int i = 0; i < LIGHT_SAMPLES; ++i) {
        float fT = abs(0.0) * 2.0 * PI + (PI * float(0%LIGHT_SAMPLES) / float(LIGHT_SAMPLES)) + 2.0 * PI * (float(i) / float(LIGHT_SAMPLES));
        vec2 vecT = vec2(cos(fT), sin(fT));

        vec2 vecSample = vec2(1.0, 0.0);
        vecSample = vecSample.xx * vec2(1.0, 1.0) * vecT.xy + vecSample.yy * vec2(-1.0, 1.0) * vecT.yx;
        vecSample *= scale;

        vec2 vecLightSampleOffset = vecSample.xx * vec2(1.0, 1.0) * axes.xy + vecSample.yy * vec2(-1.0, 1.0) * axes.yx;
        vec2 vecLightSamplePoint = center.xy + vecLightSampleOffset.xy;

        vec4 lookup = vec4(position, 1.0);
        lookup.xy += vecLightSamplePoint;
        lookup /= lookup.w;
        lookup.xy += vec2(1.0);
        lookup.xy *= 0.5;
        

        float x = lookup.x - 0.5;
        float y = lookup.y - 0.5;

        float cx = x/a;
        float cy = y/b;
        float intensity = b/a*sqrt(a*a-x*x);
        color = vec4((1.0 - (cx*cx + cy*cy)));
    }


    /*float x = texCoord.x - 0.5;
    float y = texCoord.y - 0.5;
    float m = min(0.5/a, 0.5/b);
    
    float cx = x/a/m;
    float cy = y/b/m;
    float intensity = b/a*sqrt(a*a-x*x);
    color = vec4(1.0 - (cx * cx + cy * cy));*/
}