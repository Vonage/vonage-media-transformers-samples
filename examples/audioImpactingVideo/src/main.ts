import { Source } from "./source";
import { Target } from "./target";

import { Pipeline } from "./pipeline";
import { FaceColorTransformer } from "./transformers/face_color_transformer";
import {
    VolumeExtractorTransformer,
    VolumeOwnerTransformer,
} from "./transformers/volume_extractor_transformer";
import { VolumeHistogramTransformer } from "./transformers/volume_histogram_transformer";
import { vec3 } from "./types";
import { bindButtonToLink, bindSwitch, bindSlider } from "./utils/ui";

const DEFAULT_MIN_VOLUME: number = 0.0001;
const DEFAULT_MAX_VOLUME: number = 0.01;
const DEFAULT_COLOR: vec3 = [255, 0, 0];

async function main() {
    const { audioTransformers, videoTransformers } = createTransformers();
    const pipeline = new Pipeline({
        source: await Source.camera(),
        targetOriginal: new Target("source_video"),
        targetProcessed: new Target("preview_video"),
        audioTransformers,
        videoTransformers,
    });
    pipeline.start();

    bindButtonToLink(
        "githubButton",
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/dontSpeakTooLoud"
    );

    bindButtonToLink(
        "vividButton",
        "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid"
    );

    bindSwitch("cameraswitch", (value: boolean) => {
        value ? pipeline.start() : pipeline.stop();
    });

    bindSlider("sensitivity_slider", (value: number) => {
        videoTransformers.forEach((t: any) => (t.maxVolume = value));
    });
}

function createTransformers(): {
    audioTransformers: Transformer[];
    videoTransformers: VolumeOwnerTransformer[];
} {
    const faceColorTransformer = new FaceColorTransformer(
        DEFAULT_MIN_VOLUME,
        DEFAULT_MAX_VOLUME,
        DEFAULT_COLOR
    );
    const volumeHistogramTransformer = new VolumeHistogramTransformer(
        DEFAULT_MAX_VOLUME,
        DEFAULT_COLOR
    );
    const volumeExtractorTransformer = new VolumeExtractorTransformer([
        faceColorTransformer,
        volumeHistogramTransformer,
    ]);

    return {
        audioTransformers: [volumeExtractorTransformer],
        videoTransformers: [faceColorTransformer, volumeHistogramTransformer],
    };
}

window.onload = main;
