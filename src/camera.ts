import { vec3, quat, vec2, vec4, mat4, quat2 } from "gl-matrix";
import * as $ from "jquery";

export default class Camera {
    
    private mouseDown = false;
    private lastMousePos = vec2.create();

    private targetQuat = quat.fromValues(0.0, 0.0, -1.0, 0.0);
    private canvas: HTMLCanvasElement;
    
    private currentZoom = 1.0;

    public constructor(target: vec3) {

        this.canvas = document.getElementById("theCanvas") as HTMLCanvasElement;
        const wheelHandler = this.onMouseScroll.bind(this);
        $(this.canvas)
            .mousedown(this.setMouseDown.bind(this, true))
            .mouseup(this.setMouseDown.bind(this, false))
            .mouseleave(this.setMouseDown.bind(this, false))
            .mousemove(this.onMouseMove.bind(this))
            .contextmenu(function() {return false;})
            .bind("wheel.zoom", function(e) { wheelHandler(e.originalEvent as WheelEvent); });
    }

    private setMouseDown(value: boolean): void {
        this.mouseDown = value;
    }


    private onMouseMove(ev: JQuery.MouseMoveEvent): void {

        const x = 1.0 - ev.offsetX * 2.0 / this.canvas.clientWidth;
        const y = 1.0 - ev.offsetY * 2.0 / this.canvas.clientHeight;

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

        if(dist <= 0.75) {
            return quat.fromValues(delta[0], delta[1], Math.sqrt(1.0 - dist), 0.0);
        } 

        const proj = vec2.normalize(vec2.create(), delta);
        return quat.fromValues(proj[0], proj[1], 0.0, 0.0);
    }

    private onMouseScroll(ev: WheelEvent): void {
        this.zoom(ev.deltaY / 400);
    }

    public rotate(dx: number, dy: number): void {
        const mousePos = vec2.fromValues(dx, dy);
        const cRot = this.screentoArcball(mousePos);
        const pRot = this.screentoArcball(this.lastMousePos);
        const newTarget = quat.mul(quat.create(), quat.mul(quat.create(), this.targetQuat, pRot), cRot);
        this.targetQuat = quat.normalize(newTarget, newTarget);
    }

    public zoom(distance: number): void {
        this.currentZoom = this.currentZoom + distance;
    }

    public getRadius(): number { return this.currentZoom;}


    public upDir(scale: number): vec3 {
        const thePos = vec3.transformQuat(vec3.create(), vec3.fromValues(0.0, -scale, 0.0), this.targetQuat);
        return thePos;
    }

    public leftDir(scale: number): vec3 {
        const thePos = vec3.transformQuat(vec3.create(), vec3.fromValues(scale, 0.0, 0.0), this.targetQuat);
        return thePos;
    }

    public position(scale: number): vec3 {
        const thePos = vec3.transformQuat(vec3.create(), vec3.fromValues(0.0, 0.0, scale), this.targetQuat);
        return thePos;
    }

    public getRotated(point: vec3): vec3 {
        return vec3.transformQuat(vec3.create(), point, this.targetQuat);
    }
}