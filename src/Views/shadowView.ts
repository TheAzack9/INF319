import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4, vec3, vec4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import createCubeMesh from '../cubeMesh';

import vert from "../shaders/shadowsource.vert";
import frag from "../shaders/shadowsource.frag";

import shadowvert from "../shaders/shadowplane.vert";
import shadowfrag from "../shaders/shadowplane.frag";

import viewVert from "../shaders/viewsource.vert";
import viewFrag from "../shaders/viewsource.frag";

import { initShaderProgram, VolumeData } from '../shader';
import createSquareMesh from '../squareMesh';

class ShadowView implements View {

    private gl: WebGL2RenderingContext;

    private renderTarget: RenderTarget;

    private readonly planeCount = 2;
    private opacityBuffer: RenderTarget[];
    private colorBuffer: RenderTarget[];
    private renderMesh: Mesh;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private opacityBufferShader: any;
    private viewInfo: any;

    private modelCenter: [number, number, number] = [0.5, 0.5, 0.5];

    private deltaTime: number;
    private fpsLog: number[] = [];

    private maxResolutionWidth: number;
    private maxResolutionHeight: number;

    private reducedResolutionWidth: number;
    private reducedResolutionHeight: number;

    private lastSettingsUpdate = 0;

    private maxLayers: number;
    private reducedLayers: number;
    private layers: number;
    
    public constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        this.maxResolutionWidth = 2048;
        this.maxResolutionHeight = this.maxResolutionWidth;
        this.reducedResolutionWidth = this.maxResolutionWidth;
        this.reducedResolutionHeight = this.maxResolutionHeight;

        this.maxLayers = 200;
        this.reducedLayers = 100;
        this.layers = this.reducedLayers;

        

        this.opacityBuffer = [];
        this.colorBuffer = [];
        for(let target = 0; target < this.planeCount; ++target) {
            this.opacityBuffer.push(new RenderTarget(gl, this.maxResolutionWidth/4.0, this.maxResolutionHeight/4.0))
            this.colorBuffer.push(new RenderTarget(gl, this.maxResolutionWidth/4.0, this.maxResolutionHeight/4.0))
        }

        this.renderMesh = createSquareMesh();

        this.renderTarget = new RenderTarget(gl, this.maxResolutionWidth, this.maxResolutionHeight)

        this.deltaTime = 0.0;

        const shadowProgram = initShaderProgram(gl, shadowvert, shadowfrag);
        this.opacityBufferShader = {
            program: shadowProgram,
            uniformLocations: {
                eyePos: gl.getUniformLocation(shadowProgram, "uEyePosition"),
                textureData: gl.getUniformLocation(shadowProgram, "volumeData"),
                previousOpacityBuffer: gl.getUniformLocation(shadowProgram, "previousOpacityBuffer"),
                previousColorBuffer: gl.getUniformLocation(shadowProgram, "previousColorBuffer"),
                projectionMatrix: gl.getUniformLocation(shadowProgram, "uProjectionMatrix"),
                modelViewMatrix: gl.getUniformLocation(shadowProgram, "uModelViewMatrix"),
                offset: gl.getUniformLocation(shadowProgram, "uOffset"),
                index: gl.getUniformLocation(shadowProgram, "uIndex"),
                layers: gl.getUniformLocation(shadowProgram, "layers"),
                textureSize: gl.getUniformLocation(shadowProgram, "uTextureSize"),
                lowValColor: gl.getUniformLocation(shadowProgram, "lowValColor"),
                highValColor: gl.getUniformLocation(shadowProgram, "highValColor")
            }
        }
        
        const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
        this.viewInfo = {
            program: viewProgram,
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(viewProgram, "uProjectionMatrix"),
                modelViewMatrix: gl.getUniformLocation(viewProgram, "uModelViewMatrix"),
            },
        };
    }

    render(aspect: number, volumeData: VolumeData, camera: Camera, settings: Settings): void {
        const gl = this.gl;
        if(this.updateFps(camera, settings)) {

            const zNear = 0.1;
            const zFar = 100.0;
            if (settings.isOrtographicCamera()) {
                mat4.ortho(this.projectionMatrix, -1.0, 1.0, -1.0, 1.0, zNear, zFar);
            } else {
                const fieldOfView = 45 * Math.PI / 180;   // in radians
                mat4.perspective(this.projectionMatrix, fieldOfView, 
                    aspect, zNear, zFar);
            }

            const eye = camera.position();
            mat4.lookAt(this.modelViewMatrix, eye, this.modelCenter, [0.0, 1.0, 0.0]);

            const layers = this.layers;
            for(let i = 0; i < layers; ++i) {

                const bufferIdx = i % this.planeCount;
                const otherBufferIdx = (i+this.planeCount-1)%this.planeCount;

                const target = this.opacityBuffer[bufferIdx];
                target.bindFramebuffer();
                
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, null);
                
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, null);
                
                gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
                
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorBuffer[bufferIdx].getTexture(), 0);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, target.getTexture(), 0);
                

                gl.useProgram(this.opacityBufferShader.program);
                
                if(i > 0) {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this.opacityBuffer[otherBufferIdx].getTexture());
                    gl.uniform1i(this.opacityBufferShader.uniformLocations.previousOpacityBuffer, 0);
                    
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer[otherBufferIdx].getTexture());
                    gl.uniform1i(this.opacityBufferShader.uniformLocations.previousColorBuffer, 2);
                } 
                
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_3D, volumeData.texture);
                gl.uniform1i(this.opacityBufferShader.uniformLocations.textureData, 1);
                
                gl.uniform3fv(this.opacityBufferShader.uniformLocations.eyePos, eye);

                gl.uniform2f(this.opacityBufferShader.uniformLocations.textureSize, target.getWidth(), target.getHeight());

                gl.uniform1f(this.opacityBufferShader.uniformLocations.offset, i/(layers-1));
                gl.uniform1i(this.opacityBufferShader.uniformLocations.index, i);
                gl.uniform1i(this.opacityBufferShader.uniformLocations.layers, layers);
                
                const c1 = settings.colorSkin();
                gl.uniform3f(this.opacityBufferShader.uniformLocations.lowValColor, c1[0], c1[1], c1[2]);
                const c2 = settings.colorBone();
                gl.uniform3f(this.opacityBufferShader.uniformLocations.highValColor, c2[0], c2[1], c2[2]);

                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.clearDepth(1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.viewport(0, 0, target.getWidth(), target.getHeight());
                
                this.renderMesh.bindShader(gl, this.opacityBufferShader.program);
                gl.drawElements(gl.TRIANGLES, this.renderMesh.indiceCount(), gl.UNSIGNED_SHORT, 0);

            }


             this.renderTarget.bindFramebuffer();
             gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.FRONT);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());

            
            
            
            // gl.useProgram(this.programInfo.program);
            // gl.uniform3fv(this.programInfo.uniformLocations.eyePos, eye);

            // const c1 = settings.colorSkin();
            // gl.uniform3f(this.programInfo.uniformLocations.lowValColor, c1[0], c1[1], c1[2]);
            // const c2 = settings.colorBone();
            // gl.uniform3f(this.programInfo.uniformLocations.highValColor, c2[0], c2[1], c2[2]);

            // gl.uniformMatrix4fv(
            //     this.programInfo.uniformLocations.projectionMatrix,
            //     false,
            //     this.projectionMatrix);

            // gl.uniformMatrix4fv(
            //     this.programInfo.uniformLocations.modelViewMatrix,
            //     false,
            //     this.modelViewMatrix);

            // gl.uniform1i(this.programInfo.uniformLocations.textureData, 0);
            // gl.uniform1i(this.programInfo.uniformLocations.normalData, 1);
            // gl.activeTexture(gl.TEXTURE0);
            // gl.bindTexture(gl.TEXTURE_3D, volumeData.texture);
            // gl.activeTexture(gl.TEXTURE1);
            // gl.bindTexture(gl.TEXTURE_3D, volumeData.normalTexture);
            const depth = settings.skinOpacity();
            // gl.uniform1f(this.programInfo.uniformLocations.depth, depth);
            // {
            //     this.mesh.bindShader(gl, this.programInfo.program);
            //     //gl.drawElements(gl.TRIANGLES, this.mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
            // }
             gl.disable(gl.CULL_FACE);
            
            gl.useProgram(this.viewInfo.program);

            const i = Math.round((this.colorBuffer.length-1) * depth);
            //for(let i = this.opacityBuffer.length-1; i >= 0; --i) 
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer[i].getTexture());
                
                const transformed = mat4.create();
                const transformedEye = vec3.create();
                
                vec3.transformMat4(transformedEye, eye, this.modelViewMatrix);

                mat4.targetTo(transformed, vec3.fromValues(0.5, 0.5, 0.5), eye, [0.0, 1.0, 0.0]);
                const scale = mat4.create();
                mat4.scale(scale, scale, vec3.fromValues(2.0, 2.0, 2.0));
                //mat4.scale(scale, scale, vec3.fromValues(0.5,0.5,0.5));
                mat4.multiply(transformed, transformed, scale);
                mat4.multiply(transformed, this.modelViewMatrix, transformed);
                //mat4.translate(transformed, transformed, vec3.fromValues(0.5, 0.5, 2.0 * -i/(this.colorBuffer.length-1)));
                

                gl.uniformMatrix4fv(
                    this.viewInfo.uniformLocations.modelViewMatrix,
                    false,
                    transformed);
                gl.uniformMatrix4fv(
                    this.viewInfo.uniformLocations.projectionMatrix,
                    false,
                    this.projectionMatrix);
                    
                this.renderMesh.bindShader(gl, this.viewInfo.program);
                gl.drawElements(gl.TRIANGLES, this.renderMesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }


    private updateFps(camera: Camera, settings: Settings): boolean {

        const optimalFps = 30;

        const newTime = window.performance.now();
        const fps = 1/Math.max(newTime - this.deltaTime, 1) * 1000;
        if(this.deltaTime == 0.0) {
            this.deltaTime = newTime;
            return true;
        }
        this.deltaTime = newTime;

        this.fpsLog.push(fps);
        if(this.fpsLog.length > 10) {
            this.fpsLog.shift();
        } 
        const avgFps = this.fpsLog.reduce((a, b) => a+b, 0) / 10.0;
        settings.setFps(Math.round(avgFps).toString());
        
        const viewUpdated = settings.isUpdated() || camera.isUpdated();
        if (!viewUpdated && this.lastSettingsUpdate + 1000 < Date.now()) {
            const doUpdate = this.layers != this.maxLayers;
            this.layers = this.maxLayers;
            return doUpdate;
        }

        if(viewUpdated) {
            this.lastSettingsUpdate = Date.now();
            if(this.maxLayers == this.layers) {
                this.layers = this.reducedLayers;
                return true;
            }
        }
        
        let  factor = fps / optimalFps;
        factor = Math.max(Math.min(Math.sqrt(factor), 1.0), 0.1);
        let newFactor = Math.round(factor * 10) / 10;
        newFactor = Math.max(Math.min(newFactor, 1.0), 0.7);
        if(newFactor < 1.0 && avgFps < optimalFps && fps < optimalFps) {

            const layers = Math.round(this.layers * newFactor);
            this.reducedLayers = layers;
            this.layers = layers;
        }
        return true;
    }
}

export default ShadowView;