import { frameToCanvas } from "../utils/canvas";

export class IdleVideoTransformer {
    // Rendering
    private canvas: OffscreenCanvas;
    private context: OffscreenCanvasRenderingContext2D;

    constructor() {
        this.canvas = new OffscreenCanvas(0, 0);
        this.context = this.canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    }

    public async transform?(frame: VideoFrame, controller: TransformStreamDefaultController) {
        controller.enqueue(frame);
    }
}
