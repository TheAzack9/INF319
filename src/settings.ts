import setupPicker from "./picker";
import { vec3 } from "gl-matrix";
import { VolumeData } from "./shader";

export default class Settings {
    private skinOpacityElem: HTMLInputElement;
    private elevationElem: HTMLInputElement;
    private azimuthElem: HTMLInputElement;
    private rotationElem: HTMLInputElement;
    private shadowElem: HTMLInputElement;
    private isOrthoElem: HTMLInputElement;
    private pickerSkin: vec3 = [0.0, 0.0, 1.0];
    private pickerBone: vec3 = [0.001, 0.0, 0.0];
    private fpsText: HTMLSpanElement;
    private updated = true;

    public data: VolumeData;

    public constructor(data: VolumeData) {
        const sidebar = document.getElementById("sidebar") as HTMLDivElement;
        this.data = data;
        {
            const div = document.createElement("div");
            this.fpsText = document.createElement("span");
            this.fpsText.innerText = "FPS: N/A";
            div.appendChild(this.fpsText);
            sidebar.appendChild(div);
        }

        const defaultSkinOpacity = 0.3;
        this.skinOpacityElem = createInput(
            "Skin Opacity",
            "range",
            0.0,
            1.0,
            defaultSkinOpacity,
            0.001,
            "slider",
            "skinOpacity"
        );

        const shadow = 0.0;
        this.shadowElem = createInput(
            "Shadow",
            "range",
            0.0,
            3.0,
            shadow,
            0.001,
            "slider",
            "skinOpacity"
        );

        const elevation = 3.1415/2.0;
        this.elevationElem = createInput(
            "Elevation",
            "range",
            0.0,
            3.1415*2.0,
            elevation,
            0.001,
            "slider",
            "skinOpacity"
        );
        
        const azimuth = 0.0;
        this.azimuthElem = createInput(
            "Azimuth",
            "range",
            0.0,
            3.1415*2.0,
            azimuth,
            0.001,
            "slider",
            "skinOpacity"
        );
        const rotation = 3.1415/4.0;
        this.rotationElem = createInput(
            "Rotation",
            "range",
            0.0,
            3.1415*2.0,
            rotation,
            0.001,
            "slider",
            "skinOpacity"
        );

        this.skinOpacityElem.oninput = (): void => {this.updated = true;}

        this.isOrthoElem = createInput(
            "Orthographic Camera",
            "checkbox",
            0.0,
            1.0,
            0.0,
            1.0,
            "checkbox",
            "orthographic-camera"
        );
        this.isOrthoElem.oninput = (): void => {this.updated = true;}

        {
            const div = document.createElement("div");
            const pickerSkin = document.createElement("button");
            pickerSkin.innerText = "Tissue color";
            div.appendChild(pickerSkin);
            sidebar.appendChild(div);
            setupPicker(pickerSkin, "#FFE0BDFF", this.setColorSkin.bind(this));
        }
        {
            const div = document.createElement("div");
            const pickerBone = document.createElement("button");
            pickerBone.innerText = "Bone color";
            div.appendChild(pickerBone);
            sidebar.appendChild(div);
            setupPicker(pickerBone, "#FFFFFFFF", this.setColorBone.bind(this));
        }
    }

    public isUpdated(): boolean {
        const v = this.updated;
        this.updated = false;
        return v;
    }

    public skinOpacity(): number {
        const v = parseFloat(this.skinOpacityElem.value);
        return v;
    }

    public shadow(): number {
        const v = parseFloat(this.shadowElem.value);
        return v;
    }

    public elevation(): number {
        const v = parseFloat(this.elevationElem.value);
        return v;
    }

    public azimuth(): number {
        const v = parseFloat(this.azimuthElem.value);
        return v;
    }

    public rotation(): number {
        const v = parseFloat(this.rotationElem.value);
        return v;
    }

    public isOrtographicCamera(): boolean {
        const v = this.isOrthoElem.checked;
        return v;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setColorSkin(color: any): void {
        this.pickerSkin[0] = color.rgba[0];
        this.pickerSkin[1] = color.rgba[1];
        this.pickerSkin[2] = color.rgba[2];
        this.updated = true;
    }

    public colorSkin(): vec3 {
        return this.pickerSkin;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private setColorBone(color: any): void {
        this.pickerBone[0] = color.rgba[0];
        this.pickerBone[1] = color.rgba[1];
        this.pickerBone[2] = color.rgba[2];
        this.updated = true;
    }

    public colorBone(): vec3 {
        return this.pickerBone;
    }

    public setFps(fps: string): void {
        this.fpsText.innerText = "FPS: " + fps;
    }
}

function createInput(
    name: string,
    type: string,
    min: number,
    max: number,
    value: number,
    step: number,
    cssClass: string,
    id: string
): HTMLInputElement {
    const sidebar = document.getElementById("sidebar") as HTMLDivElement;

    const div = document.createElement("div");
    div.classList.add("settingsContainer");

    const title = document.createElement("label");
    title.innerText = name;
    div.appendChild(title);

    div.appendChild(document.createElement("br"));

    const input = document.createElement("input");
    input.type = type;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.classList.add(cssClass);
    input.id = id;
    input.value = String(value);
    div.appendChild(input);

    sidebar.appendChild(div);

    return input;
}
