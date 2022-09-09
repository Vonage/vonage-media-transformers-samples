import { Source } from "./source";
import { Target } from "./target";

import { Pipeline } from "./pipeline";
import { vec3 } from "./types";
import { bindButtonToLink, bindSwitch, bindSlider } from "./utils/ui";
import { IdleVideoTransformer } from "./transformers/idle_video_transformer";
import { IdleAudioTransformer } from "./transformers/idle_audio_transformer";
import { OpenTokFacade } from "./facades/opentok_facade";

const API_KEY = "47568411";
const SESSION_ID = "2_MX40NzU2ODQxMX5-MTY2MjcwMTIxNzU5NH5yUVVHMDJUNUZ3UWQxNmJKaDBLMm0vSzZ-fg";
const TOKEN =
    "T1==cGFydG5lcl9pZD00NzU2ODQxMSZzaWc9MzdiODkwZmUyMzhhM2JhMDI3ZmZkYTZmMTMyM2Y0ODFjZTgwMzM4ZjpzZXNzaW9uX2lkPTJfTVg0ME56VTJPRFF4TVg1LU1UWTJNamN3TVRJeE56VTVOSDV5VVZWSE1ESlVOVVozVVdReE5tSkthREJMTW0wdlN6Wi1mZyZjcmVhdGVfdGltZT0xNjYyNzAxMjM1Jm5vbmNlPTAuMzM1NTQwNTgzNzY0MjYyNDMmcm9sZT1wdWJsaXNoZXImZXhwaXJlX3RpbWU9MTY2Mjc4NzYzNSZpbml0aWFsX2xheW91dF9jbGFzc19saXN0PQ==";

async function main() {
    const opentok = new OpenTokFacade();
    await opentok.connect(API_KEY, SESSION_ID, TOKEN);

    const outcomingPipeline = new Pipeline({
        source: await Source.camera(),
        targetProcessed: Target.video("incoming-stream-video"),
        audioTransformers: [new IdleAudioTransformer()],
        videoTransformers: [new IdleVideoTransformer()],
    });

    const incommingPipeline = new Pipeline({
        source: await Source.camera(),
        targetProcessed: Target.video("incoming-stream-video"),
        audioTransformers: [new IdleAudioTransformer()],
        videoTransformers: [new IdleVideoTransformer()],
    });
    pipeline.start();
}

window.onload = main;
