import {
    HandsResults,
    MediapipeHelper,
    MediaPipeResults,
    SelfieSegmentationResults,
} from "@vonage/ml-transformers";
import { vec2 } from "../types";
import { frameToCanvas } from "../utils/canvas";

export class HandExtractorTransformer {
    public leftHand?: vec2;
    public rightHand?: vec2;

    private readonly mediapipeHelper = new MediapipeHelper();
    private mediapipeResults?: HandsResults;

    constructor() {
        this.mediapipeHelper.initialize({
            mediaPipeModelConfigArray: [
                {
                    modelType: "hands",
                    options: {
                        modelComplexity: 1,
                        selfieMode: false,
                        minDetectionConfidence: 0.1,
                        minTrackingConfidence: 0.1,
                    },
                    listener: (results: MediaPipeResults): void => {
                        this.mediapipeResults = results as HandsResults;
                        console.log(results);
                    },
                },
            ],
        });
    }

    public async transform?(frame: VideoFrame, controller: TransformStreamDefaultController) {
        const frameAsBitmap = await createImageBitmap(frame);
        this.mediapipeHelper.send(frameAsBitmap);

        this.mediapipeResults?.multiHandLandmarks.forEach((landmarks, index) => {
            const classification = this.mediapipeResults?.multiHandedness[index];
            const center: vec2 = [0, 0];

            landmarks.forEach(({ x, y }) => {
                center[0] += x;
                center[1] += x;
            });
            center[0] /= landmarks.length;
            center[1] /= landmarks.length;

            if (classification?.label == "Right") {
                this.rightHand = center;
            } else {
                this.leftHand = center;
            }
        });
        controller.enqueue(frame);
    }
}
