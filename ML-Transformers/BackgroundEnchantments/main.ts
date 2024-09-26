import CameraSource from "./js/camera-source";
import {
  BackgroundTransformerType,
  BlurRadius,
  createVonageMediaProcessor,
  isSupported,
  MediaProcessorConfig,
  RenderingType,
  VonageMediaProcessor,
  WebglSelfieSegmentationType,
} from "@vonage/ml-transformers";
import { setVonageMetadata } from "@vonage/media-processor";
import packageInfo from './package.json';

const MEDIA_ASSETS_URI: string =
  "media/";
const configs: { [key: string]: MediaProcessorConfig } = {
  blurLow: {
    transformerType: BackgroundTransformerType.BackgroundBlur,
    radius: BlurRadius.Low,
  },
  blurHigh: {
    transformerType: BackgroundTransformerType.BackgroundBlur,
    radius: BlurRadius.High,
  },
  virtual: {
    transformerType: BackgroundTransformerType.VirtualBackground,
    backgroundAssetUri: `${MEDIA_ASSETS_URI}virtual.jpeg`,
  },
  video: {
    transformerType: BackgroundTransformerType.VideoBackground,
    backgroundAssetUri: `${MEDIA_ASSETS_URI}bbb.mp4`,
  },
  silhouetteLow: {
    transformerType: BackgroundTransformerType.SilhouetteBlur,
    radius: BlurRadius.Low,
  },
  silhouetteHigh: {
    transformerType: BackgroundTransformerType.SilhouetteBlur,
    radius: BlurRadius.High,
  },
};

type Optional<T> = T | undefined;

function $<T = any>(s: string) {
  const element = document.getElementById(s);
  if (!element) throw `Unable to find element #${s}`;
  return element as unknown as T;
}

async function main() {
  let source: CameraSource = new CameraSource();
  let config: Optional<MediaProcessorConfig>;
  let selfieSegmentationType: Optional<WebglSelfieSegmentationType>;
  let processor: VonageMediaProcessor;

  async function init() {
    try {
      await isSupported();
    } catch (e) {
      alert("Something bad happened: " + e);
    }

    setVonageMetadata({ appId: "test_app_id", sourceType: "video" as any });

    cameraSwitch.disabled = true;
    try {
      await source.init();
    } catch (e) {
      alert("An error happen while initializing camera " + e);
    }
  }

  async function enableProcessor(): Promise<boolean> {
    const config = getConfig();
    if (config) {
      processor = await createVonageMediaProcessor(config);

      processor.on("error", (eventData) => console.error("error", eventData));
      processor.on("warn", (eventData) => console.warn("warn", eventData));
      processor.setTrackExpectedRate(30);
      await source.setMediaProcessorConnector(processor.getConnector());
      console.log("all done and running");
    }
    return config !== undefined;
  }

  async function disableProcessor() {
    source.stopMediaProcessorConnector();
  }

  function getConfig(): Optional<MediaProcessorConfig> {
    if (!config) return;

    const finalConfig = { ...config };

    if (selfieSegmentationType) {
      finalConfig.renderingOptions = {
        type: RenderingType.WEBGL,
        selfieSegmentationType,
      };
    }

    return finalConfig;
  }

  async function updateProcessor(): Promise<void> {
    const config = getConfig();
    if (config && processor) {
      processor.setBackgroundOptions(config);
    }
  }

  const cameraSwitch = $("cameraswitch");
  const githubButton = $("githubButton");
  const vividButton = $("vividButton");
  const typeSelect = $("typeSelector");
  const segmentationSelect = $("segmentationSelector");
  const versionTag = $("version_tag");

  versionTag.innerText = `@vonage/ml-transformers version: ${packageInfo.dependencies['@vonage/ml-transformers']}`;

  cameraSwitch.addEventListener("change", async () => {
    const checked = cameraSwitch.checked;
    if (checked) {
      if (!(await enableProcessor())) {
        cameraSwitch.checked = false;
      }
    } else {
      disableProcessor();
    }
  });
  cameraSwitch.addEventListener("click", () => {
    if (cameraSwitch.disabled) {
      $("disabledHover")?.show();
    }
  });

  typeSelect.addEventListener("change", () => {
    const type = typeSelect.value;
    if (!configs[type]) throw `Undefined type [${type}]`;
    config = configs[type];
    cameraSwitch.disabled = false;
    updateProcessor();
  });

  segmentationSelect.addEventListener("change", () => {
    const segmentation = segmentationSelect.value;
    switch (segmentation) {
      case "auto":
        selfieSegmentationType = undefined;
        break;
      case "fast":
        selfieSegmentationType = WebglSelfieSegmentationType.FAST;
        break;
      case "precise":
        selfieSegmentationType = WebglSelfieSegmentationType.PRECISE;
        break;
    }
    updateProcessor();
  });

  githubButton.addEventListener("click", () => {
    window
      .open(
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/mediapipe/BackgroundEnchantments",
        "_blank"
      )
      ?.focus();
  });

  vividButton.addEventListener("click", () => {
    window
      .open(
        "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid",
        "_blank"
      )
      ?.focus();
  });

  await init();
}

window.onload = main;
