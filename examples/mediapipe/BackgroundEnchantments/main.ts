import CameraSource from "./js/camera-source";
import {
  BlurRadius,
  createVonageMediaProcessor,
  isSupported,
  MediaProcessorConfig,
} from "@vonage/ml-transformers";
import { setVonageMetadata } from "@vonage/media-processor";

async function main() {
  try {
    await isSupported();
  } catch (e) {
    alert("Something bad happened: " + e);
  }

  const cameraswitchSelector: any = document.getElementById("cameraswitch");
  const githubButtonSelector: HTMLElement | null =
    document.getElementById("githubButton");
  const vividButtonSelector: HTMLElement | null =
    document.getElementById("vividButton");
  const backgroundPostProcessSelector: any = document.getElementById(
    "postProcessSelector"
  );
  let cameraSwitchChecked: boolean = false;

  const MEDIA_ASSETS_URI: string =
    "https://vonage-background-enchantments-sample.s3.amazonaws.com/";

  let videoSource_: CameraSource = new CameraSource();
  await videoSource_.init().catch((e) => {
    alert("error initing camera, " + e);
    return;
  });

  function getConfig(type: string): MediaProcessorConfig {
    let config: MediaProcessorConfig = {
      transformerType: "BackgroundBlur",
      radius: BlurRadius.High,
    };

    if (type === "blurLow" || type === "blurHigh") {
      config = {
        transformerType: "BackgroundBlur",
        radius: type === "blurLow" ? BlurRadius.Low : BlurRadius.High,
      };
    } else if (type === "virtual") {
      config = {
        transformerType: "VirtualBackground",
        backgroundAssetUri: MEDIA_ASSETS_URI + "virtual.jpeg",
      };
    } else if (type === "video") {
      config = {
        transformerType: "VideoBackground",
        backgroundAssetUri: MEDIA_ASSETS_URI + "bbb.mp4",
      };
    } else if (type === "silhouettLow" || type === "silhouetteHigh") {
      config = {
        transformerType: "SilhouetteBlur",
        radius: type === "silhouettLow" ? BlurRadius.Low : BlurRadius.High,
      };
    }
    return config;
  }

  let processor: any;
  async function updateCameraSwitch(isChecked: boolean) {
    const backgroundType = backgroundPostProcessSelector.value;

    setVonageMetadata({ appId: "test_app_id", sourceType: "video" as any });
    if (!isChecked) {
      backgroundPostProcessSelector.disabled = false;
      await videoSource_.stopMediaProcessorConnector();
    } else {
      processor = await createVonageMediaProcessor(getConfig(backgroundType));
      const connector = processor.getConnector();
      processor.on("error", (eventData: any) => {
        console.log("error", eventData);
      });
      processor.on("warn", (eventData: any) => {
        console.log("warn", eventData);
      });
      processor.setTrackExpectedRate(30);
      videoSource_
        .setMediaProcessorConnector(connector)
        .then(() => {
          console.log("all done and running");
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }
  cameraswitchSelector.addEventListener("change", (event: any) => {
    cameraSwitchChecked = event.target.checked;
    updateCameraSwitch(event.target.checked);
  });

  if (githubButtonSelector) {
    githubButtonSelector.addEventListener("click", () => {
      window
        .open(
          "https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/mediapipe/BackgroundEnchantments",
          "_blank"
        )
        ?.focus();
    });
  }

  if (vividButtonSelector) {
    vividButtonSelector.addEventListener("click", () => {
      window
        .open(
          "https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid",
          "_blank"
        )
        ?.focus();
    });
  }

  cameraswitchSelector.disabled = true;
  cameraswitchSelector.addEventListener("mouseenter", () => {
    if (cameraswitchSelector.disabled) {
      var snackbar: any = document.getElementById("disabledHover");
      if (snackbar) {
        snackbar.show();
      }
    }
  });

  function checkEnableCameraSwitch() {
    const backgroundType = backgroundPostProcessSelector.value;
    if (backgroundType != "Choose_an_item") {
      var snackbar: any = document.getElementById("disabledHover");
      if (snackbar) {
        snackbar.close();
      }
      cameraswitchSelector.disabled = false;
    } else {
      cameraswitchSelector.disabled = true;
    }
  }

  backgroundPostProcessSelector.addEventListener("change", () => {
    checkEnableCameraSwitch();
    if (cameraSwitchChecked) {
      const backgroundType = backgroundPostProcessSelector.value;
      processor
        ?.setBackgroundOptions(getConfig(backgroundType))
        .then(() => {
          console.log("update success");
        })
        .catch((e: any) => {
          console.error(e);
        });
    }
  });
}

window.onload = main;
