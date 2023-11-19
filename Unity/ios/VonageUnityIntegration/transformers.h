#ifndef TRANSFORMERS_H_
#define TRANSFORMERS_H_

#include <modules/vonage/api/media_processor/base_frame_transformer.h>

namespace webrtc {
    class AudioFrame;
    class VideoFrame;
}

namespace vonage {
class TransformerObserver : public webrtc::BaseFrameTransformerObserver {
public:
    TransformerObserver();
    virtual ~TransformerObserver();
    
    // BaseFrameTransformerObsever implementation.
    void OnWarning(webrtc::MediaProcessorWarningCode code, const std::string& message) override;
    void OnError(webrtc::MediaProcessorErrorCode code, const std::string& message) override;
};

class VonageUnityVideoTransformer : public webrtc::BaseFrameTransformer<webrtc::VideoFrame> {
public:
    VonageUnityVideoTransformer(webrtc::BaseFrameTransformerObserver* observer);
    virtual ~VonageUnityVideoTransformer();
    
    // webrtc::BaseFrameTransformer
    void Transform(webrtc::VideoFrame* target_frame) override;
    bool SetTransformerConfig(const vonage::MLTransformerBaseConfig* config) override;
    
private:
    uint32_t *inputArgbBuffer_;
};
}

#endif // TRANSFORMERS_H_
