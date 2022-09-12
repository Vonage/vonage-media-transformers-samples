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

const DEFAULT_MIN_VOLUME: number = 0.0001;
const DEFAULT_MAX_VOLUME: number = 0.01;
const DEFAULT_COLOR: vec3 = [255, 0, 0];
const API_KEY = "47568411";
const SESSION_ID = "2_MX40NzU2ODQxMX5-MTY2Mjk2NTI4OTA1NX4ybzAzRXo5Qm1tUXFVRnVrQ3pEc1luUVB-fg";
const TOKEN =
    "T1==cGFydG5lcl9pZD00NzU2ODQxMSZzaWc9MWNkMTYzZTE3ODI3OGY4ZjgwOWVmYTg1YzcwMjdkYTI1NGEzNjc1MzpzZXNzaW9uX2lkPTJfTVg0ME56VTJPRFF4TVg1LU1UWTJNamsyTlRJNE9UQTFOWDR5YnpBelJYbzVRbTF0VVhGVlJuVnJRM3BFYzFsdVVWQi1mZyZjcmVhdGVfdGltZT0xNjYyOTY1MzQyJm5vbmNlPTAuNzE4NjgwOTg3NDEyNzIyNyZyb2xlPXB1Ymxpc2hlciZleHBpcmVfdGltZT0xNjY1NTU3MzQxJmluaXRpYWxfbGF5b3V0X2NsYXNzX2xpc3Q9";

async function main() {
    const camera = await Source.camera();
    const incomingDiv = document.getElementsByClassName("incoming-stream")[0] as HTMLElement;
    const upcomingVideo = Target.video("upcoming-stream-video");
    const upcomingStream = new MediaStream();

    upcomingVideo.setStream(upcomingStream);
    upcomingVideo.start();

    const { audioTransformers, videoTransformers } = createTransformers();
    const upcomingPipeline = new Pipeline({
        source: camera,
        targetProcessed: Target.stream(upcomingStream),
        audioTransformers,
        videoTransformers,
    });
    await upcomingPipeline.start();

    const opentok = new OpenTokFacade(Source.stream(upcomingStream), incomingDiv);
    await opentok.connect(API_KEY, SESSION_ID, TOKEN);
}

window.onload = main;

/*
 ✔  10:08:00 
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
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/audioImpactingVideo"
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
*/

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
