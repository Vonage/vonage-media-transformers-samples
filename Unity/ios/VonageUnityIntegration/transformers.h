#ifndef TRANSFORMERS_H_
#define TRANSFORMERS_H_

#include <api/frame_transformer_interface.h>

namespace webrtc {
    class AudioFrame;
    class VideoFrame;
}

namespace vonage {

    class VonageUnityVideoTransformer : public webrtc::BaseFrameTransformer<webrtc::VideoFrame> {
    public:
        VonageUnityVideoTransformer();
        virtual ~VonageUnityVideoTransformer();

        // webrtc::BaseFrameTransformer
        void Transform(webrtc::VideoFrame* target_frame) override;
        
    private:
        uint32_t *inputArgbBuffer_;
        uint8_t *outputYBuffer_;
        uint8_t *outputUBuffer_;
        uint8_t *outputVBuffer_;
        const int NUM_PIXELS = 640 * 480;
        const int BUFFER_SIZE = NUM_PIXELS * 4;
        
    };
}

#endif // TRANSFORMERS_H_
