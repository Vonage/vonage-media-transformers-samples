import { Source } from "./source";
import { Target } from "./target";

import { OpenTokFacade } from "./facades/opentok_facade";
import { Pipeline } from "./pipeline";
import { FaceColorTransformer } from "./transformers/face_color_transformer";
import {
    VolumeOwnerTransformer,
    VolumeExtractorTransformer,
} from "./transformers/volume_extractor_transformer";
import { VolumeHistogramTransformer } from "./transformers/volume_histogram_transformer";
import { vec3 } from "./types";
import { bindButtonToLink, bindSwitch, bindSlider, notifyError } from "./utils/ui";

const DEFAULT_MIN_VOLUME: number = 0.0001;
const DEFAULT_MAX_VOLUME: number = 0.01;
const DEFAULT_COLOR: vec3 = [255, 0, 0];

async function main() {
    const { audioTransformers, videoTransformers } = createTransformers();
    const pipeline = new Pipeline({
        source: await Source.camera(),
        targetOriginal: Target.video("source_video"),
        audioTransformers,
        videoTransformers,
    });

    const opentok = new OpenTokFacade(
        document.getElementsByClassName("incoming-stream")[0] as HTMLElement
    );

    await Promise.all([pipeline.start()]);

    bindButtonToLink(
        "githubButton",
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/audioImpactingVideo"
    );

    bindButtonToLink(
        "vividButton",
        "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid"
    );

    const inputApiKey = document.getElementById("input_api_key") as HTMLInputElement;
    const inputSessionId = document.getElementById("input_session_id") as HTMLInputElement;
    const inputToken = document.getElementById("input_token") as HTMLInputElement;

    bindSwitch("connect", async (value: boolean) => {
        if (value) {
            inputApiKey.disabled = true;
            inputSessionId.disabled = true;
            inputToken.disabled = true;
            const result = await opentok.connect(
                inputApiKey.value,
                inputSessionId.value,
                inputToken.value
            );
            if (!result) {
                notifyError(
                    "Failled to connect to OpenTok. Please, ensure your api key, session id and token are correct."
                );
            }
            console.log("DONE");
        } else {
            inputApiKey.disabled = false;
            inputSessionId.disabled = false;
            inputToken.disabled = false;
            await opentok.disconnect();
        }
    });
    bindSwitch("cameraswitch", (value: boolean) => {
        if (value) {
            opentok.setVideoMediaProcessorConnector(pipeline.videoConnector);
        } else {
            opentok.setVideoMediaProcessorConnector();
        }
    });

    bindSlider("sensitivity_slider", (value: number) => {
        videoTransformers.forEach((t: any) => (t.maxVolume = value));
    });
}

window.onload = main;

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
