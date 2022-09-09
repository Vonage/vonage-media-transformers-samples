import { Source } from "./source";
import { Target } from "./target";

import { Pipeline } from "./pipeline";
import { vec3 } from "./types";
import { bindButtonToLink, bindSwitch, bindSlider } from "./utils/ui";
import { IdleVideoTransformer } from "./transformers/idle_video_transformer";
import { IdleAudioTransformer } from "./transformers/idle_audio_transformer";

async function main() {
  const pipeline = new Pipeline({
    source: await Source.camera(),
    targetProcessed: new Target("incoming-stream-video"),
    audioTransformers: [new IdleAudioTransformer()],
    videoTransformers: [new IdleVideoTransformer()],
  });
  pipeline.start();
}

window.onload = main;
