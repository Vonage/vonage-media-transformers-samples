import {
    HandsResults,
    MediapipeHelper,
    MediaPipeResults,
    SelfieSegmentationResults,
} from "@vonage/ml-transformers";
import { vec2 } from "../types";
import { frameToCanvas } from "../utils/canvas";
import { HandExtractorTransformer } from "./hands_extractor_transformer";

export class ShowFilterTransformer {
    private canvas: OffscreenCanvas;
    private context: OffscreenCanvasRenderingContext2D;

    constructor(private readonly hands: HandExtractorTransformer) {
        this.canvas = new OffscreenCanvas(0, 0);
        this.context = this.canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    }

    public async transform?(frame: VideoFrame, controller: TransformStreamDefaultController) {
        frameToCanvas(frame, this.context);
        if (this.hands.leftHand) {
            this.context.beginPath();
            this.context.lineWidth = 5;
            this.context.strokeStyle = "rgba(255, 255, 255, .8)";
            this.context.arc(
                this.hands.leftHand[0] * frame.displayWidth,
                this.hands.leftHand[1] * frame.displayHeight,
                20,
                0,
                Math.PI * 2
            );
            this.context.stroke();
        } else if (this.hands.rightHand) {
            this.context.beginPath();
            this.context.lineWidth = 5;
            this.context.strokeStyle = "rgba(255, 255, 255, .8)";
            this.context.arc(
                this.hands.rightHand[0] * frame.displayWidth,
                this.hands.rightHand[1] * frame.displayHeight,
                20,
                0,
                Math.PI * 2
            );
            this.context.stroke();
        }

        this.context.beginPath();
        this.context.lineWidth = 3;
        this.context.strokeStyle = "rgba(255, 255, 255, .4)";
        this.context.moveTo(frame.displayWidth / 2, 0);
        this.context.lineTo(frame.displayWidth / 2, frame.displayHeight);
        this.context.stroke();

        this.context.beginPath();
        this.context.lineWidth = 3;
        this.context.strokeStyle = "rgba(255, 255, 255, .4)";
        this.context.moveTo(0, frame.displayHeight / 2);
        this.context.lineTo(frame.displayWidth, frame.displayHeight / 2);
        this.context.stroke();

        this.context.beginPath();
        this.context.lineWidth = 3;
        this.context.fillStyle = "rgba(255, 255, 255, .8)";
        this.context.font = "30px Arial";
        this.context.fillText("Low pitch", frame.displayWidth / 2 + 20, frame.displayHeight - 20);
        this.context.fillText("High pitch", frame.displayWidth / 2 + 20, 40);

        frame.close();
        controller.enqueue(
            new VideoFrame(this.canvas as any as HTMLCanvasElement, {
                timestamp: frame.timestamp ?? 0,
                alpha: "discard",
            })
        );
    }
}
