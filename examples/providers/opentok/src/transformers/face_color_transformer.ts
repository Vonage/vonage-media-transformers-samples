import {
    MediapipeHelper,
    MediaPipeResults,
    SelfieSegmentationResults,
} from "@vonage/ml-transformers";
import { map, clip } from "../utils/math";
import { vec3 } from "../types";
import { ApplyColor } from "../webgl/apply_color/apply_color";
import { VolumeOwnerTransformer } from "./volume_extractor_transformer";

export class FaceColorTransformer implements VolumeOwnerTransformer {
    // Public
    public color: vec3;
    public volume: number = 0;
    public maxVolume: number;
    public minVolume: number;

    // Mediapipe
    private readonly mediapipeHelper = new MediapipeHelper();
    private mediapipeResults?: SelfieSegmentationResults;

    // Rendering
    private canvas: OffscreenCanvas;
    private program: ApplyColor;

    constructor(minVolume: number, maxVolume: number, color: vec3) {
        this.minVolume = minVolume;
        this.maxVolume = maxVolume;
        this.color = color;
        this.canvas = new OffscreenCanvas(0, 0);
        this.program = new ApplyColor(this.canvas);

        this.mediapipeHelper.initialize({
            mediaPipeModelConfigArray: [
                {
                    modelType: "selfie_segmentation",
                    options: {
                        selfieMode: false,
                        modelSelection: 1,
                    },
                    listener: (results: MediaPipeResults): void => {
                        this.mediapipeResults = results as SelfieSegmentationResults;
                    },
                },
            ],
        });
    }

    public async transform?(frame: VideoFrame, controller: TransformStreamDefaultController) {
        const frameAsBitmap = await createImageBitmap(frame);

        this.mediapipeHelper.send(frameAsBitmap);

        if (this.mediapipeResults) {
            this.canvas.width = frame.displayWidth;
            this.canvas.height = frame.displayHeight;
            const clippedVolume = clip(this.volume, this.minVolume, this.maxVolume);
            const loudness = map(clippedVolume, this.minVolume, this.maxVolume, 0, 1) ** 2;
            this.program.run(this.mediapipeResults.image, this.mediapipeResults.segmentationMask, [
                ...(this.color.map((v) => v) as vec3),
                loudness * 0.02,
            ]);

            frame.close();
            controller.enqueue(
                new VideoFrame(this.canvas as any as HTMLCanvasElement, {
                    timestamp: frame.timestamp ?? 0,
                    alpha: "discard",
                })
            );
        }
    }
}
