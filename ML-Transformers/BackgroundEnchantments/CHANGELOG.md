# BackgroundEnchantments @vonage/ml-transformers Demo Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

The versioning of this project is directly tied to the version of @vonage/ml-transformers dependency

## 6.0.0 - 2025-01-22

### Features

- Improved segmentation quality

### Changed

- Changed MediaProcessorConfig option `mediapipeBaseAssetsUri`. This option allows you to set the path of the mediapipe assets to be used. At this Uri the library expects the following file routes to be available:

```shell
/task-vision.js
/wasm/vision_wasm_internal.js
/wasm/vision_wasm_internal.wasm
```

### Added

- Added optional MediaProcessorConfig option `modelAssetUriPath`. This option allows you to set the url of the tflite model to be used. *However the library will used provided hosted assets by default so we do NOT recommend using it.*

### Removed

- Removed MediaProcessorConfig option `wasmAssetUriPath`, use `mediapipeBaseAssetsUri` instead to specify assets path if needed.
- Removed MediaProcessorConfig option `tfliteAssetUriPath`, use `mediapipeBaseAssetsUri` instead to specify assets path if needed.

## 6.0.0-alpha.2 - 2025-01-07

### Changed

- Upgrade @vonage/ml-transformers to version 6.0.0-alpha.2. which includes the following:
  - internal change to use config option `mediapipeBaseAssetsUri` to fetch mediapipe assets when provided.
    At this Uri the library expects the following:

    ```bash
    /task-vision.js
    /wasm/vision_wasm_internal.js
    /wasm/vision_wasm_internal.wasm
    ```

  - remove mediapipe variable TaskManager from global namespace

## 6.0.0-alpha.1 - 2024-12-19

### Changed

- Upgrade @vonage/ml-transformers to version 6.0.0-alpha.1. which includes the following:
  - change to config option field `modelAssetUriPath`: The library now expects a full path for model including filename and extension e.g. `example.com/assets/vonage_selfie_segmenter.tflite`.

## 6.0.0-alpha.0 - 2024-12-05

### Changed

- Upgrade @vonage/ml-transformers to version 6.0.0-alpha.0. which includes the following:
  - Improved segmentation and all changes included up to 5.2.0-alpha.4

### Added

- new optional config field `modelAssetUriPath`. Used to override model.
- The SDK expects this to be a url directory path ending in a trailing slash. At this path the SDK will try to fetch a the model as a resource called 'vonage_selfie_segmenter.tflite'.

### Removed

- `vonageSelfieSegmentationEngine` config option from `5.2.0-alpha.x`. This has been removed and is no longer required.
- `tfliteAssetUriPath` and `wasmAssetUriPath` config options have been removed. See Added section from new field `modelAssetUriPath`.

## 5.2.0-alpha.4 - 2024-11-12

### Changed

- Upgrade @vonage/ml-transformers to version 5.2.0-alpha.4. which includes the following:
  - Improved segmentation

## 5.2.0-alpha.3 - 2024-11-07

### Changed

- Upgrade @vonage/ml-transformers to version 5.2.0-alpha.3. which includes the following:
  - Improved rendering pipeline when in webGL when using WebGL PRECISE renderingOptions

    ```ts
    renderingOptions: {
      type: RenderingType.WEBGL,
      selfieSegmentationType: WebglSelfieSegmentationType.PRECISE
    }
    ```

### Fixed

- Background resizing when using CANVAS renderer
- Invalid timestamp crash when using Canvas as video source
- Pipeline crash when changing WebGL renderer multiple times

## 5.2.0-alpha.2 - 2024-10-23

### Changed

- Upgrade @vonage/ml-transformers to version 5.2.0-alpha.2. which includes the following:
  - improved flickering reduction when using `'vonageSelfieSegmentationEngine': false`
  - improved blend for CANVAS rendering when using `'vonageSelfieSegmentationEngine': false`

## 5.2.0-alpha.1 - 2024-10-09

### Changed

- Upgrade @vonage/ml-transformers to version 5.2.0-alpha.1. which enables a new selfie segmentation engine and adds an edge blur to canvas rendering. Enabled by setting config field `vonageSelfieSegmentationEngine` to `false`.

## 5.2.0-alpha.0 - 2024-09-27

### Changed

- Upgrade @vonage/ml-transformers to version 5.2.0-alpha.0. This alpha has no code changes from 5.1.3.

## 5.1.3 - 2024-03-21

### Changed

- Upgrade @vonage/ml-transformers to version 5.1.3
