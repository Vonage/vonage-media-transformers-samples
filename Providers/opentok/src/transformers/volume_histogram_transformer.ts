import { vec3 } from "../types";
import { frameToCanvas } from "../utils/canvas";
import { VolumeOwnerTransformer } from "./volume_extractor_transformer";

const HISTORY_LENGTH: number = 200;

export class VolumeHistogramTransformer implements VolumeOwnerTransformer {
    // Public
    public volume: number = 0;
    public history: number[] = new Array(HISTORY_LENGTH).fill(0);
    public maxVolume: number;
    public height: number = 100;
    public color: vec3;

    // Rendering
    private canvas: OffscreenCanvas;
    private context: OffscreenCanvasRenderingContext2D;

    constructor(maxVolume: number, color: vec3) {
        this.maxVolume = maxVolume;
        this.color = color;
        this.canvas = new OffscreenCanvas(0, 0);
        this.context = this.canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    }

    public async transform?(frame: VideoFrame, controller: TransformStreamDefaultController) {
        this.history.unshift(this.volume);
        if (this.history.length > HISTORY_LENGTH) {
            this.history.pop();
        }

        frameToCanvas(frame, this.context);

        this.context.save();
        this.renderBackground();
        this.context.clip();
        this.renderHistogram();
        this.context.restore();

        frame.close();
        controller.enqueue(
            new VideoFrame(this.canvas as any as HTMLCanvasElement, {
                timestamp: frame.timestamp ?? 0,
                alpha: "discard",
            })
        );
    }

    private renderBackground() {
        this.context.beginPath();
        this.context.lineWidth = 1;
        this.context.fillStyle = "rgba(255,255,255,.2)";
        this.context.rect(0, this.canvas.height - this.height, this.canvas.width, this.height);
        this.context.fill();
    }

    private renderHistogram() {
        const gradient = this.context.createLinearGradient(
            0,
            this.canvas.height,
            0,
            this.canvas.height - this.height
        );
        gradient.addColorStop(0, `rgba(${this.color.join(",")},0)`);
        gradient.addColorStop(1, `rgba(${this.color.join(",")},1)`);

        this.context.beginPath();
        this.context.fillStyle = gradient;
        this.context.moveTo(this.canvas.width, this.canvas.height);
        const xStep = this.canvas.width / (HISTORY_LENGTH - 1);
        for (let i = 0; i < HISTORY_LENGTH; ++i) {
            const volume = this.history[i];
            const x = this.canvas.width - i * xStep;
            this.context.lineTo(x, this.canvas.height - this.height * (volume / this.maxVolume));
        }

        this.context.lineTo(0, this.canvas.height);
        this.context.strokeStyle = "rgba(0,0,0,.5)";
        this.context.lineWidth = 4;
        this.context.stroke();
        this.context.strokeStyle = "white";
        this.context.lineWidth = 1;
        this.context.stroke();
        this.context.fill();
    }
}
