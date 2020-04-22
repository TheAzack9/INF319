#version 300 es

precision highp float;
precision highp int;
precision highp sampler3D;

in vec3 position;
in vec2 texCoord;

out lowp vec4 color;

const float PI = 3.1415;

const vec3 lightPos = vec3(0.0, 0.5, 1.0);
const vec3 eyePos = vec3(0.0, 0.0, 1.0);
const float thetaAngle = PI/8.0;

const float layer_distance = 1.0/1.0;

void main() {

    //cos(alpha) = do

    float cos_alpha = dot(normalize(eyePos), normalize(lightPos));
    float alpha = acos(cos_alpha);


    float R = layer_distance * tan(thetaAngle) / cos_alpha;
    float a_1 = R / sin(PI/2.0 + thetaAngle - alpha) * sin(PI/2.0 - thetaAngle);
    float a_2 = R / sin(PI/2.0 - thetaAngle - alpha) * sin(PI/2.0 + thetaAngle);
    float A = (a_1+a_2) / 2.0;

    float OC = abs((a_2 - a_1) / 2.0);
    
    //float d_prime = sin(alpha) * OC;
    float d_prime = (layer_distance * R) / tan(thetaAngle);
    float R_prime = R + layer_distance * R;
    float B = sqrt(R_prime*R_prime - OC*OC + d_prime * d_prime);

    mat2 rotation = mat2(cos(alpha), -sin(alpha), sin(alpha), cos(alpha));

    vec2 position = /*rotation * */ ((texCoord - 0.5) * 2.0);
    float x = position.x;
    float y = position.y;

    float k_C = x*x- 2.0*x*OC + OC*OC + y*y/(B*B);
    float k_B = 2.0*x*OC + 2.0*OC*OC;
    float k_A = OC*OC - 1.0;

    float k_1 = (-k_B + sqrt(k_B*k_B - 4.0*k_A*k_C)) / (2.0*k_A);
    float k_2 = (-k_B - sqrt(k_B*k_B - 4.0*k_A*k_C)) / (2.0*k_A);

    float k = max(k_1, k_2);
    float weight = 1.0 - k;


    color = vec4(weight );

}