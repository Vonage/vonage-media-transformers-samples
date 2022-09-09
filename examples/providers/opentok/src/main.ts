import { Source } from "./source";
import { Target } from "./target";

import { OpenTokFacade } from "./facades/opentok_facade";
import { Pipeline } from "./pipeline";
import { HandExtractorTransformer } from "./transformers/hands_extractor_transformer";
import { IdleAudioTransformer } from "./transformers/idle_audio_transformer";

const API_KEY = "47568411";
const SESSION_ID = "2_MX40NzU2ODQxMX5-MTY2MjcwMTIxNzU5NH5yUVVHMDJUNUZ3UWQxNmJKaDBLMm0vSzZ-fg";
const TOKEN =
    "T1==cGFydG5lcl9pZD00NzU2ODQxMSZzaWc9MzdiODkwZmUyMzhhM2JhMDI3ZmZkYTZmMTMyM2Y0ODFjZTgwMzM4ZjpzZXNzaW9uX2lkPTJfTVg0ME56VTJPRFF4TVg1LU1UWTJNamN3TVRJeE56VTVOSDV5VVZWSE1ESlVOVVozVVdReE5tSkthREJMTW0wdlN6Wi1mZyZjcmVhdGVfdGltZT0xNjYyNzAxMjM1Jm5vbmNlPTAuMzM1NTQwNTgzNzY0MjYyNDMmcm9sZT1wdWJsaXNoZXImZXhwaXJlX3RpbWU9MTY2Mjc4NzYzNSZpbml0aWFsX2xheW91dF9jbGFzc19saXN0PQ==";

async function main() {
    const camera = await Source.camera();
    const incomingDiv = document.getElementsByClassName("incoming-stream")[0] as HTMLElement;
    const upcomingVideo = Target.video("upcoming-stream-video");
    const upcomingStream = new MediaStream();

    upcomingVideo.setStream(upcomingStream);
    upcomingVideo.start();

    const upcomingPipeline = new Pipeline({
        source: camera,
        targetProcessed: Target.stream(upcomingStream),
        audioTransformers: [new IdleAudioTransformer()],
        videoTransformers: [new HandExtractorTransformer()],
    });
    await upcomingPipeline.start();

    const opentok = new OpenTokFacade(Source.stream(upcomingStream), incomingDiv);
    await opentok.connect(API_KEY, SESSION_ID, TOKEN);
}

window.onload = main;
