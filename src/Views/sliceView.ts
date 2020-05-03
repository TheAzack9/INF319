import View from '../view';
import RenderTarget from '../renderTarget';
import Settings from '../settings';
import { mat4, vec3, vec4 } from 'gl-matrix';
import Camera from '../camera';
import Mesh from '../mesh';
import vert from "../shaders/slice.vert";
import frag from "../shaders/slice.frag";
import { initShaderProgram, LoadedTextureData } from '../shader';
import TransferFunctionController from '../transferFunction';
import * as $ from "jquery";

export default class SliceView implements View {
    private gl: WebGL2RenderingContext;
    private renderTarget: RenderTarget;
    private programInfo: ProgramInfo;
    //private transferFunction: TransferFunctionController;
    // private transferFunctionTexture: WebGLTexture;
    private volumeData: LoadedTextureData;
    private slices: Slice[] = [];
    private projectionMatrix: mat4 = mat4.create();
    private canvas: HTMLCanvasElement;
    private controlWidth = 0.5;
    private controlHeight = 0.5;
    private controlDepth = 0.5;
    private modelCenter: [number, number, number] = [0.5, 0.5, 0.5];
    private mesh3d: Mesh;
    private aspectRatioCache = 1;
    public textureUpdated = false;

    public constructor(
        gl: WebGL2RenderingContext,
        transferFunction: TransferFunctionController,
        renderTarget: RenderTarget,
        volumeData: LoadedTextureData) {
        this.gl = gl;
        this.renderTarget = renderTarget;
        this.volumeData = volumeData;

        // this.transferFunction = transferFunction;
        // this.transferFunctionTexture = gl.createTexture() as WebGLTexture;

        this.slices.push(new Slice(gl, [255, 0, 0], 0.0, 0.5, 0.5, 1.0,
            volumeData.width, volumeData.height));
        this.slices.push(new Slice(gl, [0, 255, 0], 0.5, 1.0, 0.5, 1.0,
            volumeData.width, volumeData.depth));
        this.slices.push(new Slice(gl, [0, 0, 255], 0.5, 1.0, 0.0, 0.5,
            volumeData.height, volumeData.depth));

        this.mesh3d = new Mesh();
        const positions = [
            -1, -1, 0,
             1, -1, 0,
             1,  1, 0,
            -1,  1, 0,
        ];
        const faces = [0, 1, 2, 0, 2, 3];
        const texCoords = [0, 0, 1, 0, 1, 1, 0, 1];
        this.mesh3d.setPositions(positions, faces);
        this.mesh3d.setTexturePositions(texCoords);

        const shaderProgram = initShaderProgram(gl, vert, frag);
        this.programInfo = new ProgramInfo(gl, shaderProgram);

        $("#theCanvas").click(this.click.bind(this));
        this.canvas = document.getElementById("theCanvas") as HTMLCanvasElement;

        this.cacheSlices();
    }

    private click(ev: JQuery.ClickEvent): void {
        const x = ev.clientX, y = ev.clientY;
        const glx = (x / this.canvas.width) * 2 - 1;
        const gly = (1 - y / this.canvas.height) * 2 - 1;
        
        for (let i = 0; i < this.slices.length; i++) {
            const slice = this.slices[i];
            const hit = slice.hit(glx, gly, this.aspectRatioCache);
            if (hit === null) continue;

            const hitx = hit[0], hity = hit[1];
            switch (i) {
                case 0:
                    this.controlWidth = hitx;
                    this.controlHeight = hity;
                    break;
                case 1:
                    this.controlWidth = hitx;
                    this.controlDepth = hity;
                    break;
                case 2:
                    this.controlHeight = hitx;
                    this.controlDepth = hity;
                    break;
                default:
                    console.warn("No click handler for slice #" + i);
            }
            this.cacheSlices();
            this.textureUpdated = true;
            break;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public render(aspect: number, camera: Camera, settings: Settings): void {
        const gl = this.gl;
        this.aspectRatioCache = aspect;
        
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.viewport(0, 0, this.renderTarget.getWidth(), this.renderTarget.getHeight());
        gl.useProgram(this.programInfo.program);

        mat4.ortho(this.projectionMatrix, -1.0 * aspect, 1.0, -1.0 / aspect, 1.0, 0.0, 50.0);

        for (let i = 0; i < this.slices.length; i++) {
            // 2D slice
            const slice = this.slices[i];
            const c = slice.color;
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, this.projectionMatrix);
            gl.uniform1i(this.programInfo.uniformLocations.textureData, 3 + i);
            gl.uniform3f(this.programInfo.uniformLocations.borderColor, c[0], c[1], c[2])
            gl.bindTexture(gl.TEXTURE_2D, slice.getTexture());
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, slice.w(), slice.h(), 0, gl.RED, gl.FLOAT, slice.getTexCache());
            slice.getMesh().bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, slice.getMesh().indiceCount(), gl.UNSIGNED_SHORT, 0);

            // 3D planar representation
            const perspective = mat4.create(), matrix = mat4.create();
            const fieldOfView = 45 * Math.PI / 180, zNear = 0.1, zFar = 40.0;
            mat4.perspective(perspective, fieldOfView, aspect, zNear, zFar);
            const lookat = mat4.copy(mat4.create(), camera.getTransform());
            mat4.translate(lookat, lookat, vec3.negate(vec3.create(), this.modelCenter));
            //mat4.lookAt(lookat, camera.position(), this.modelCenter, [0.0, 1.0, 0.0]);

            mat4.identity(matrix);

            switch (i) {
                case 0:
                    mat4.translate(matrix, matrix, [0, 0, this.controlDepth]);
                    break;
                case 1:
                    mat4.translate(matrix, matrix, [0, this.controlHeight, 0]);
                    mat4.rotateX(matrix, matrix, Math.PI / 2)
                    break;
                case 2:
                    mat4.translate(matrix, matrix, [this.controlWidth, 0, 0]);
                    mat4.rotateY(matrix, matrix, -Math.PI / 2);
                    mat4.rotateZ(matrix, matrix, Math.PI / 2);
                    mat4.rotateX(matrix, matrix, Math.PI);
                    break;
            }

            mat4.multiply(matrix, lookat, matrix);
            mat4.multiply(matrix, perspective, matrix);
            
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, matrix);
            const mesh = new Slice(gl, [1, 1, 1], 0, 1, 0, 1, slice.w(), slice.h());
            mesh.getMesh().bindShader(gl, this.programInfo.program);
            gl.drawElements(gl.TRIANGLES, mesh.getMesh().indiceCount(), gl.UNSIGNED_SHORT, 0);
        }
    }

    private cacheSlices(): void {
        const gl = this.gl;
        { // Depth
            const z = Math.floor(this.volumeData.depth * this.controlDepth);
            const sliceSize = this.volumeData.width * this.volumeData.height;
            this.slices[0].setTexCache(this.volumeData.data.slice(z * sliceSize, (z + 1) * sliceSize));
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[0].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.height, 0, gl.RED, gl.FLOAT, this.slices[0].getTexCache());
        }
        { // Height
            const offset = Math.floor(this.volumeData.height * this.controlHeight);
            const hOff = offset * this.volumeData.width;
            const sliceSize = this.volumeData.depth * this.volumeData.width;
            const texCache = new Float32Array(sliceSize);
            let i = 0;
            for (let d = 0; d < this.volumeData.depth; d++) {
                const dOff = d * this.volumeData.height * this.volumeData.width;
                for (let w = 0; w < this.volumeData.width; w++) {
                    const wOff = w;
                    texCache[i++] = this.volumeData.data[hOff + dOff + wOff];
                }
            }
            this.slices[1].setTexCache(texCache);
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[1].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.width,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.slices[1].getTexCache());
        }
        { // Width
            const wOff = Math.floor(this.volumeData.width * this.controlWidth);
            const sliceSize = this.volumeData.depth * this.volumeData.width;
            const texCache = new Float32Array(sliceSize);
            let i = 0;
            for (let d = 0; d < this.volumeData.depth; d++) {
                const dOff = d * this.volumeData.height * this.volumeData.width;
                for (let h = 0; h < this.volumeData.height; h++) {
                    const hOff = h * this.volumeData.width;
                    texCache[i++] = this.volumeData.data[dOff + hOff + wOff];
                }
            }
            this.slices[2].setTexCache(texCache);
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, this.slices[2].getTexture());
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, this.volumeData.height,
                this.volumeData.depth, 0, gl.RED, gl.FLOAT, this.slices[2].getTexCache());
        }
    }

    getRenderTarget(): RenderTarget {
        return this.renderTarget;
    }
}

class Slice {
    private x1: number;
    private x2: number;
    private y1: number;
    private y2: number;
    private mesh: Mesh;
    private texture: WebGLTexture;
    private texW: number;
    private texH: number;
    private texCache: Float32Array = new Float32Array();
    public color: vec3;

    constructor(gl: WebGL2RenderingContext, color: vec3, x1: number, x2: number, y1: number, y2: number, w: number, h: number) {
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
        this.texW = w;
        this.texH = h;
        this.color = color;
        this.texture = gl.createTexture() as WebGLTexture;
        this.mesh = Slice.mesh(x1, x2, y1, y2);
    }

    public hit(x: number, y: number, aspect: number): [number, number] | null {
        const proj = mat4.create();
        mat4.ortho(proj, -1.0 * aspect, 1.0, -1.0 / aspect, 1.0, 0.0, 50.0);

        const v1 = vec4.create(), v2 = vec4.create();
        vec4.transformMat4(v1, [this.x1, this.y1, 1, 1], proj);
        vec4.transformMat4(v2, [this.x2, this.y2, 1, 1], proj);

        const x1 = v1[0], y1 = v1[1], x2 = v2[0], y2 = v2[1];

        const hit = x1 < x && x < x2 && y1 < y && y < y2;
        if (!hit) return null;
        return [
            Math.abs(x - x1) / Math.abs(x2 - x1),
            Math.abs(y - y1) / Math.abs(y2 - y1)
        ];
    }

    public getTexture(): WebGLTexture {
        return this.texture;
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public w(): number { return this.texW }
    public h(): number { return this.texH }
    public getTexCache(): Float32Array { return this.texCache; }
    public setTexCache(t: Float32Array): void { this.texCache = t; }

    private static mesh(x1: number, x2: number, y1: number, y2: number): Mesh {
        const mesh = new Mesh();
        const positions = [
            x1, y1, 0.0,
            x2, y1, 0.0,
            x2, y2, 0.0,
            x1, y2, 0.0,
        ];
        const faces = [0, 1, 2, 0, 2, 3];
        const texCoords = [
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ];
        mesh.setPositions(positions, faces);
        mesh.setTexturePositions(texCoords);
        return mesh;
    }
}

class ProgramInfo {
    program: WebGLShader;
    uniformLocations: UniformLocations;

    constructor(gl: WebGL2RenderingContext, program: WebGLShader) {
        this.program = program;
        this.uniformLocations = new UniformLocations(gl, program);
    }
}

class UniformLocations {
    projectionMatrix: WebGLUniformLocation;
    //transferFunction: WebGLUniformLocation;
    textureData: WebGLUniformLocation;
    borderColor: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext, shaderProgram: WebGLShader) {
        this.projectionMatrix =
            gl.getUniformLocation(shaderProgram, "uProjectionMatrix") as WebGLUniformLocation;
        //this.transferFunction =
        //    gl.getUniformLocation(shaderProgram, "uTransferFunction") as WebGLUniformLocation;
        this.textureData =
            gl.getUniformLocation(shaderProgram, "textureData") as WebGLUniformLocation;
        this.borderColor =
            gl.getUniformLocation(shaderProgram, "borderColor") as WebGLUniformLocation;
    }
}