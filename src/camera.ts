import { vec3, quat, vec2, vec4, mat4, quat2 } from "gl-matrix";
import * as $ from "jquery";

export default class Camera {
    
    private mouseDown = false;
    private lastMousePos = vec2.create();

    private targetQuat = quat.fromValues(0.0, 0.0, 4.0, 0.0);
    private canvas: HTMLCanvasElement;
    
    private currentZoom = 4.0;

    public constructor(target: vec3) {

        this.canvas = document.getElementById("theCanvas") as HTMLCanvasElement;
        const wheelHandler = this.onMouseScroll.bind(this);
        $(this.canvas)
            .mousedown(this.setMouseDown.bind(this, true))
            .mouseup(this.setMouseDown.bind(this, false))
            .mouseleave(this.setMouseDown.bind(this, false))
            .mousemove(this.onMouseMove.bind(this))
            .bind("wheel.zoom", function(e) { wheelHandler(e.originalEvent as WheelEvent); });
    }

    private setMouseDown(value: boolean): void {
        this.mouseDown = value;
    }


    private onMouseMove(ev: JQuery.MouseMoveEvent): void {

        const x = ev.offsetX * 2.0 / this.canvas.clientWidth - 1.0;
        const y = ev.offsetY * 2.0 / this.canvas.clientHeight - 1.0;
        console.log(x, y);

        if (!this.mouseDown) {
            this.lastMousePos[0] = x;
            this.lastMousePos[1] = y;
            return;
        }

        this.rotate(x, y);
        this.lastMousePos[0] = x;
        this.lastMousePos[1] = y;
    }

    private screentoArcball(delta: vec2): quat {
        const dist = vec2.dot(delta, delta);

        if(dist <= 1.0) {
            return quat.fromValues(delta[0], delta[1], Math.sqrt(1.0 - dist), 0.0);
        } 

        const proj = vec2.normalize(vec2.create(), delta);
        return quat.fromValues(proj[0], proj[1], 0.0, 0.0);
    }

    private onMouseScroll(ev: WheelEvent): void {
        this.zoom(-ev.deltaY / 200);
    }

    public rotate(dx: number, dy: number): void {
        const mousePos = vec2.fromValues(dx, dy);
        const cRot = this.screentoArcball(mousePos);
        const pRot = this.screentoArcball(this.lastMousePos);
        const newTarget = quat.mul(quat.create(), quat.mul(quat.create(), cRot, pRot), this.targetQuat);
        this.targetQuat = quat.normalize(newTarget, newTarget);
    }

    public zoom(distance: number): void {
        this.currentZoom = Math.min(8.0, Math.max(1.0, this.currentZoom - distance));
    }

    public getRadius(): number { return this.currentZoom;}


    public upDir(): vec3 {
        const thePos = vec3.transformQuat(vec3.create(), vec3.fromValues(0.0, 1.0, 0.0), this.targetQuat);
        return thePos;
    }

    public leftDir(): vec3 {
        const thePos = vec3.transformQuat(vec3.create(), vec3.fromValues(1.0, 0.0, 0.0), this.targetQuat);
        return thePos;
    }

    public position(): vec3 {
        const thePos = vec3.transformQuat(vec3.create(), vec3.fromValues(0.0, 0.0, 1.0), this.targetQuat);
        return thePos;
    }
}