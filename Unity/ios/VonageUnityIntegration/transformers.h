#ifndef TRANSFORMERS_H_
#define TRANSFORMERS_H_

#include <modules/vonage/api/media_processor/base_frame_transformer.h>

namespace webrtc {
    class AudioFrame;
    class VideoFrame;
}

namespace vonage {

class DecompressAugmentedData{
public:
    virtual bool decompress(const uint8_t* inputArray,
                            uint32_t inputSize,
                            std::unique_ptr<uint8_t[]>& outputArray,
                            uint32_t& outputSize) = 0;
};

class VonageUnityVideoTransformer : public webrtc::BaseFrameTransformer<webrtc::VideoFrame> {
public:
    VonageUnityVideoTransformer(webrtc::BaseFrameTransformerObserver* observer, std::shared_ptr<DecompressAugmentedData> decompressor, bool unity_rendering_enabled);
    virtual ~VonageUnityVideoTransformer();
    
    // webrtc::BaseFrameTransformer
    void Transform(webrtc::VideoFrame* target_frame) override;
    
private:
    std::shared_ptr<DecompressAugmentedData> decompressor_;
    bool unity_rendering_enabled_;
};
}

#endif // TRANSFORMERS_H_
