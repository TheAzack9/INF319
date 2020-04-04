import RenderTarget from './renderTarget';
import Camera from './camera';
import Settings from './settings';
import { VolumeData } from './shader';

interface View {
    render(aspect: number, volumeData: VolumeData, camera: Camera, settings: Settings): void;
    getRenderTarget(): RenderTarget;
}

export default View;