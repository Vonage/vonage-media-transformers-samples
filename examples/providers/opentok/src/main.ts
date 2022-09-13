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
import { bindButtonToLink, bindSwitch, bindSlider } from "./utils/ui";

const DEFAULT_MIN_VOLUME: number = 0.0001;
const DEFAULT_MAX_VOLUME: number = 0.01;
const DEFAULT_COLOR: vec3 = [255, 0, 0];
const API_KEY = "47568411";
const SESSION_ID = "2_MX40NzU2ODQxMX5-MTY2Mjk2NTI4OTA1NX4ybzAzRXo5Qm1tUXFVRnVrQ3pEc1luUVB-fg";
const TOKEN =
    "T1==cGFydG5lcl9pZD00NzU2ODQxMSZzaWc9MWNkMTYzZTE3ODI3OGY4ZjgwOWVmYTg1YzcwMjdkYTI1NGEzNjc1MzpzZXNzaW9uX2lkPTJfTVg0ME56VTJPRFF4TVg1LU1UWTJNamsyTlRJNE9UQTFOWDR5YnpBelJYbzVRbTF0VVhGVlJuVnJRM3BFYzFsdVVWQi1mZyZjcmVhdGVfdGltZT0xNjYyOTY1MzQyJm5vbmNlPTAuNzE4NjgwOTg3NDEyNzIyNyZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNjY1NTU3MzQxJmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";

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

    await Promise.all([pipeline.start(), opentok.connect(API_KEY, SESSION_ID, TOKEN)]);

    opentok.setVideoMediaProcessorConnector(pipeline.videoConnector);

    bindButtonToLink(
        "githubButton",
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/audioImpactingVideo"
    );

    bindButtonToLink(
        "vividButton",
        "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid"
    );

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
