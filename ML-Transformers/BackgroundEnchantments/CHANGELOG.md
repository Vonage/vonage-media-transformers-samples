# BackgroundEnchantments @vonage/ml-transformers Demo Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

The versioning of this project is directly tied to the version of @vonage/ml-transformers dependency

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
