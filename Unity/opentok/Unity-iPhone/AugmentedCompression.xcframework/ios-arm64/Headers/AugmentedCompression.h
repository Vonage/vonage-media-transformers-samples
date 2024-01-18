#pragma once

#import <AVFoundation/AVFoundation.h>

#include <memory>

namespace Holographic {
class Compression{
public:
    static bool compress(const std::unique_ptr<uint8_t[]>& inputArray,
                         uint32_t inputSize,
                         std::unique_ptr<uint8_t[]>& outputArray,
                         uint32_t& outputSize);
    static bool compress(CVPixelBufferRef depthDataMap,
                         std::unique_ptr<uint8_t[]>& outputArray,
                         uint32_t& outputSize);
    static bool decompress(const uint8_t* inputArray,
                           uint32_t inputSize,
                           std::unique_ptr<uint8_t[]>& outputArray,
                           uint32_t& outputSize);
};
}
