import CameraSource from "./js/camera-source";
import {
  BackgroundTransformerType,
  BlurRadius,
  createVonageMediaProcessor,
  isSupported,
  MediaProcessorConfig,
  RenderingOptions,
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
  let renderingOptions: RenderingOptions;
  let processor: VonageMediaProcessor;

  async function init() {
    try {
      await isSupported();
    } catch (e) {
      alert("Something bad happened: " + e);
    }

    setVonageMetadata({ appId: "test_app_id", sourceType: "video" as any });

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

  function getRenderingOptions() {
    const segmentation = renderingSelect.value;
    switch (segmentation) {
      case "canvas":
        return {
          type: RenderingType.CANVAS
        };
      case "fast":
        return {
          type: RenderingType.WEBGL,
          selfieSegmentationType: WebglSelfieSegmentationType.FAST,
        };
      case "precise":
        return {
          type: RenderingType.WEBGL,
          selfieSegmentationType: WebglSelfieSegmentationType.PRECISE,
        };
    }
  }

  function getConfig(): Optional<MediaProcessorConfig> {
    const type = typeSelect.value;
    const config = configs[type];
    if (!configs[type]) throw `Undefined type [${type}]`;

    const finalConfig = {
      ...config,
      vonageSelfieSegmentationEngine: false,
      renderingOptions: getRenderingOptions(),
     };

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
  const renderingSelect = $("renderingSelector");
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

  typeSelect.addEventListener("change", () => {
    updateProcessor();
  });

  renderingSelect.addEventListener("change", () => {
    updateProcessor();
  });

  githubButton.addEventListener("click", () => {
    window
      .open(
        "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/ML-Transformers/BackgroundEnchantments",
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
