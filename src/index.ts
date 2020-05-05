import viewVert from "./shaders/view.vert";
import viewFrag from "./shaders/view.frag";

import createSquareMesh from "./meshes/squareMesh";
import { initShaderProgram, bindTexture } from "./shader";
import TransferFunctionController from "./transferFunction";

import MainView from './Views/mainView';
import SliceView from './Views/sliceView';
import Camera from "./camera";
import Settings from "./settings";

async function Init(): Promise<void> {
    const canvas = document.querySelector("#theCanvas") as HTMLCanvasElement;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    const loadedData = await bindTexture("./data/sinusveins.dat", "./data/sinusveins.ini", gl);
    const volumeData = loadedData.data;

    const settings = new Settings();
    const sidebar = document.getElementById("sidebar") as HTMLDivElement;
    const transferFunction = new TransferFunctionController(volumeData, sidebar, settings);
    const renderView = new MainView(gl, transferFunction,);
    const renderSlice = new SliceView(gl, transferFunction, renderView.getRenderTarget(), loadedData);
    const camera = new Camera([0.5, 0.5, 0.5], document.getElementById("theCanvas") as HTMLCanvasElement);
    const view = createSquareMesh(-1.0, 1.0);

    const viewProgram = initShaderProgram(gl, viewVert, viewFrag);
    const viewInfo = {
        program: viewProgram,
        uniformLocations: {
        },
    };
    
    const renderLoop = (): void => {
        // render to the canvas
        // Setup required OpenGL state for drawing the back faces and
        // composting with the background color
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        const settingsUpdated = settings.isUpdated() || transferFunction.transferFunctionUpdated;
        const sliceUpdated = renderSlice.textureUpdated;
        const newFrame = renderView.updateFps(camera, settings, settingsUpdated);
        if (newFrame || settingsUpdated || sliceUpdated) {
            renderView.getRenderTarget().bindFramebuffer();
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            renderSlice.render(canvas.clientWidth / canvas.clientHeight, camera, settings, loadedData);
            renderView.render(canvas.clientWidth / canvas.clientHeight, camera, settings, loadedData);
        }

        //test = false;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.useProgram(viewInfo.program);
        // render the cube with the texture we just rendered to
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderView.getRenderTarget().getTexture());
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

