import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4, vec3 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import createCubeMesh from '../cubeMesh';

import vert from "../source.vert";
import frag from "../source.frag";
import { initShaderProgram, VolumeData } from '../shader';

class MainView implements View {

    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;

    private projectionMatrix: mat4 = mat4.create();
    private modelViewMatrix: mat4 = mat4.create();

    private mesh: Mesh = createCubeMesh();

    private programInfo: any;

    private modelCenter: [number, number, number] = [0.5, 0.5, 0.5];

    private deltaTime: number;
    private fpsLog: number[] = [];

    private maxResolutionWidth: number;
    private maxResolutionHeight: number;

    private reducedResolutionWidth: number;
    private reducedResolutionHeight: number;

    private lastSettingsUpdate = 0;
    
    public constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;

        this.maxResolutionWidth = 2048;
        this.maxResolutionHeight = this.maxResolutionWidth;
        this.reducedResolutionWidth = this.maxResolutionWidth;
        this.reducedResolutionHeight = this.maxResolutionHeight;
        this.renderTarget = new RenderTarget(gl, this.maxResolutionWidth, this.maxResolutionHeight);


        this.deltaTime = 0.0;

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = {
            program: shaderProgram,
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
                depth: gl.getUniformLocation(shaderProgram, "uDepth"),
                eyePos: gl.getUniformLocation(shaderProgram, "uEyePosition"),
                textureData: gl.getUniformLocation(shaderProgram, "textureData"),
                normalData: gl.getUniformLocation(shaderProgram, "normalData"),
                lowValColor: gl.getUniformLocation(shaderProgram, "lowValColor"),
                highValColor: gl.getUniformLocation(shaderProgram, "highValColor")
            },
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    render(aspect: number, volumeData: VolumeData, camera: Camera, settings: Settings): void {
        const gl = this.gl;
        if(this.updateFps(camera, settings)) {

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.FRONT);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());

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
            
            gl.useProgram(this.programInfo.program);
            gl.uniform3fv(this.programInfo.uniformLocations.eyePos, eye);

            const c1 = settings.colorSkin();
            gl.uniform3f(this.programInfo.uniformLocations.lowValColor, c1[0], c1[1], c1[2]);
            const c2 = settings.colorBone();
            gl.uniform3f(this.programInfo.uniformLocations.highValColor, c2[0], c2[1], c2[2]);

            gl.uniformMatrix4fv(
                this.programInfo.uniformLocations.projectionMatrix,
                false,
                this.projectionMatrix);

            gl.uniformMatrix4fv(
                this.programInfo.uniformLocations.modelViewMatrix,
                false,
                this.modelViewMatrix);

            gl.uniform1i(this.programInfo.uniformLocations.textureData, 0);
            gl.uniform1i(this.programInfo.uniformLocations.normalData, 1);
            const depth = settings.skinOpacity();
            gl.uniform1f(this.programInfo.uniformLocations.depth, depth);
            {
                this.mesh.bindShader(gl, this.programInfo.program);
                gl.drawElements(gl.TRIANGLES, this.mesh.indiceCount(), gl.UNSIGNED_SHORT, 0);
            }
            gl.disable(gl.CULL_FACE)
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
            const doUpdate = this.maxResolutionWidth != this.renderTarget.getWidth() ||
                this.maxResolutionHeight != this.renderTarget.getHeight();
            this.renderTarget.resize(this.maxResolutionWidth, this.maxResolutionHeight);
            return doUpdate;
        }

        if(viewUpdated) {
            this.lastSettingsUpdate = Date.now();
            if(this.renderTarget.getWidth() == this.maxResolutionWidth && this.renderTarget.getHeight() == this.maxResolutionHeight) {
                this.renderTarget.resize(this.reducedResolutionWidth, this.reducedResolutionHeight);
                return true;
            }
        }
        
        let  factor = fps / optimalFps;
        factor = Math.max(Math.min(Math.sqrt(factor), 1.0), 0.1);
        let newFactor = Math.round(factor * 10) / 10;
        newFactor = Math.max(Math.min(newFactor, 1.0), 0.7);
        if(newFactor < 1.0 && avgFps < optimalFps && fps < optimalFps) {
            const renderWidth = Math.round(this.renderTarget.getWidth() * newFactor);
            const renderHeight = Math.round(this.renderTarget.getHeight() * newFactor);
            this.reducedResolutionWidth = renderWidth;
            this.reducedResolutionHeight = renderHeight;
            this.renderTarget.resize(renderWidth, renderHeight);
        }
        return true;
    }
}

export default MainView;