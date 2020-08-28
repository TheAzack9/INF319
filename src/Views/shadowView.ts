import View from "../view";
import RenderTarget from "../renderTarget";
import { initShaderProgram, Shader, LoadedTextureData } from "../shader";

import frag from "../shaders/shadow.frag";
import vert from "../shaders/shadow.vert";
import Camera from "../camera";
import Settings from "../settings";
import { mat4, vec4, vec3, vec2 } from "gl-matrix";
import Mesh from "../mesh";
import createSquareMesh from "../meshes/squareMesh";
import TransferFunctionController from "../transferFunction";

export default class ShadowView implements View {

    private targets = 2;
    private renderTargets: RenderTarget[];
    private layers = 259*4;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private shadowBufferShader: Shader;

    private gl: WebGL2RenderingContext;

    private renderMesh: Mesh;

    private presentedTarget: RenderTarget;

    private transferFunction: TransferFunctionController;

    constructor(gl: WebGL2RenderingContext, transferFunction: TransferFunctionController) {
        this.gl = gl;
        this.transferFunction = transferFunction;
        this.renderTargets = [];
        for(let i = 0; i < this.targets; ++i) {
            this.renderTargets.push(new RenderTarget(gl, 768, 768, true));
        }
        this.presentedTarget = this.renderTargets[0];
        this.shadowBufferShader = initShaderProgram(gl, vert, frag);

        this.renderMesh = createSquareMesh(-1.0, 1.0);
    }
    
    render(aspect: number, camera: Camera, settings: Settings, loadedData: LoadedTextureData): void {

        const data = settings.getLoadedData();
        const scaleMatrix = settings.getLoadedData().scale;
        const spaceScale = mat4.invert(mat4.create(), scaleMatrix);
        //const zoom = camera.zoom();
        //vec3.scale(spaceScale, spaceScale, zoom);

        // this.modelViewMatrix = mat4.copy(mat4.create(), );
        //settings.multiplyLightTransform(camera.getRotation());
        //mat4.translate(this.modelViewMatrix, this.modelViewMatrix, vec3.negate(vec3.create(), this.modelCenter));
        // const invCam = mat4.invert(mat4.create(), this.modelViewMatrix);
        // const eye4 = vec4.transformMat4(vec4.create(), vec4.fromValues(1.0, 0.0, 0.0, 1.0), this.modelViewMatrix);
        const zoomFac = camera.getRadius();
        mat4.scale(spaceScale, spaceScale, vec3.fromValues(zoomFac, zoomFac, zoomFac));
        // vec3.scale(spaceScale, spaceScale, -zoomFac / 20.0);
        const eye = camera.position(1.0) ;
        //spaceScale = vec3.fromValues(zoomFac, zoomFac, zoomFac);


        for(let i = 0; i < this.targets; ++i) {

            
            const buff = this.renderTargets[i%this.targets];
            buff.bindFramebuffer();
            
            this.gl.viewport(0, 0, buff.getWidth(), buff.getHeight());

            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1]);
            
            this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT);
            this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
            this.gl.clearDepth(1.0);
            this.gl.clearBufferfv(this.gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
            this.gl.clearBufferfv(this.gl.COLOR, 1, [0.0, 0.0, 0.0, 0.0]);
            
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        const transferFunctionTexture = this.transferFunction.getTransferFunctionTexture(this.gl);

        // Ping pong shader s for shadow buffer accumulation
        for(let i = 1; i < this.layers; ++i) {
            const ping = this.renderTargets[i%this.targets];
            const pong = this.renderTargets[(i+1)%this.targets];

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

            pong.bindFramebuffer();
            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1]);

            // bind pong texture
            this.shadowBufferShader.bind();
            this.shadowBufferShader.bindTexture2D("uPreviousBuffer", 1, ping.getTexture());
            
            // bind shadow pong texture
            this.shadowBufferShader.bind();
            this.shadowBufferShader.bindTexture2D("uPreviousShadowBuffer", 2, ping.getShadowTexture() as WebGLTexture);
            
            // Bind transfer function
            this.shadowBufferShader.bindTexture2D("uTransferFunction", 3, transferFunctionTexture);
            
            // Misc variables
            this.shadowBufferShader.bindVec3("uEye", eye);
            this.shadowBufferShader.bindVec3("uUp", camera.upDir(1.0));
            this.shadowBufferShader.bindVec3("uLeft", camera.leftDir(1.0));
            this.shadowBufferShader.bindFloat("uOffset", i/this.layers);
            this.shadowBufferShader.bindFloat("uAspect", aspect);
            this.shadowBufferShader.bindUniform1i("uIndex", i);
            this.shadowBufferShader.bindMat4("uTest", spaceScale);

            const zDistance = 1.0/this.layers;
            const softness = settings.shadow();
            const elevation = settings.elevation();
            const azimuth = settings.azimuth();
            const rotation = settings.rotation();

            // Set axis parameters
            const ratioXY = settings.ratioXY();

            const a = ratioXY;
            const b = 1.0 - ratioXY;

            const fVarX = a * softness;
            const fVarY = b * softness;

            const fElev = Math.PI - (elevation + Math.PI/2.0);

            const fZ = Math.sin(fElev);
            const fHyp = Math.cos(fElev);
            const fY = fHyp * Math.cos(azimuth);
            const fX = fHyp * Math.sin(azimuth);
            
            const fdX = (fX/fZ);
            const fdY = (fY / fZ);

            // No perspective

            const center = vec2.fromValues(fdX * zDistance, fdY * zDistance);
            const scale = vec2.fromValues(fVarX * Math.sqrt(zDistance), fVarY * Math.sqrt(zDistance));
            const axes = vec2.fromValues(Math.sin(rotation), Math.cos(rotation));
            this.shadowBufferShader.bindVec2("center", center);
            this.shadowBufferShader.bindVec2("scale", scale);
            this.shadowBufferShader.bindVec2("axes", axes);

            this.shadowBufferShader.bindFloat("uMidaFactor", settings.midaFactor());
            this.shadowBufferShader.bindFloat("uMidaShadowFactor", settings.midaShadowFactor());
            this.shadowBufferShader.bindUniform1i("uMidaMethod", settings.midaMethod());
            
            this.gl.viewport(0, 0, pong.getWidth(), pong.getHeight());

            this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT);
            this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
            this.gl.clearDepth(1.0);

            this.renderMesh.bindShader(this.gl, this.shadowBufferShader.program);
            this.gl.drawElements(this.gl.TRIANGLES, this.renderMesh.indiceCount(), this.gl.UNSIGNED_SHORT, 0);

            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            
            this.presentedTarget = pong;
        }

    }

    getRenderTarget(): RenderTarget {
        return this.presentedTarget;
    }

}