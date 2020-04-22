

import viewVert from "./shaders/viewsource.vert";
import viewFrag from "./shaders/viewsource.frag";

import createSquareMesh from "./squareMesh";
import { initShaderProgram, bindTexture } from "./shader";
import TransferFunctionController from "./transferFunction";

import View from './view';
import MainView from './Views/shadowView';
import Camera from "./camera";
import Settings from "./settings";
import { mat4 } from "gl-matrix";

async function Init(): Promise<void> {
    const canvas = document.querySelector("#theCanvas") as HTMLCanvasElement;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_float_blend');

    const renderView: View = new MainView(gl);



    const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
    const viewInfo = {
        program: viewProgram,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(viewProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(viewProgram, "uModelViewMatrix"),
        },
    };


    const settings = new Settings();
    const camera = new Camera([0.5, 0.5, 0.5]);

    //mat4.ortho(projectionMatrix, -1.0, 1.0, 1.0, -1.0, zNear, zFar);
    //mat4.ortho(projectionMatrix, 0.0, 0.0, 1.0, 1.0, zNear, zFar);

    const volumeData = await bindTexture("./data/hand.dat", gl);

    const view = createSquareMesh();
    const sidebar = document.getElementById("sidebar") as HTMLDivElement
    
    // TEMP
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //const transferFunction = new TransferFunctionController(volumeData, sidebar);

    const renderLoop = (): void => {
        // render to the canvas
        const renderTarget = renderView.getRenderTarget();
        renderTarget.bindFramebuffer();

        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        renderView.render(canvas.clientWidth / canvas.clientHeight, volumeData as any, camera, settings);

        //test = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.useProgram(viewInfo.program);

        gl.uniformMatrix4fv(
            viewInfo.uniformLocations.modelViewMatrix,
            false,
            mat4.create());
        gl.uniformMatrix4fv(
            viewInfo.uniformLocations.projectionMatrix,
            false,
            mat4.create());

        // render the cube with the texture we just rendered to
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderTarget.getTexture());
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);   // clear to white

        view.bindShader(gl, viewInfo.program);
        gl.drawElements(gl.TRIANGLES, view.indiceCount(), gl.UNSIGNED_SHORT, 0.0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);

        requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
}

Init();

