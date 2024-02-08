#ifndef TRANSFORMERS_H_
#define TRANSFORMERS_H_

#include <modules/vonage/api/media_processor/base_frame_transformer.h>
#include <UnityFramework/UnityFramework.h>

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
    VonageUnityVideoTransformer(webrtc::BaseFrameTransformerObserver* observer, std::shared_ptr<DecompressAugmentedData> decompressor, bool unity_rendering_enabled, UnityFramework* unity_framework);
    virtual ~VonageUnityVideoTransformer();
    
    // webrtc::BaseFrameTransformer
    void Transform(webrtc::VideoFrame* target_frame) override;
    
private:
    std::shared_ptr<DecompressAugmentedData> decompressor_;
    bool unity_rendering_enabled_;
    std::vector<int64_t> time_gap_;
    UnityFramework* unity_framework_;
};
}

#endif // TRANSFORMERS_H_
