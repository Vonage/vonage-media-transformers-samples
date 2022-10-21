#include "transformers.h"

#include <api/audio/audio_frame.h>
#include <api/video/i420_buffer.h>
#include <api/video/video_frame.h>
#include <rtc_base/logging.h>
#include "../Unity-iPhone/Libraries/Plugins/iOS/NativeCallProxy.h"
#include <third_party/libyuv/include/libyuv.h>

namespace vonage {

    // VonageUnityVideoTransformer

    VonageUnityVideoTransformer::VonageUnityVideoTransformer() {
        inputArgbBuffer_ = new uint32_t[NUM_PIXELS];
        outputYBuffer_ = new uint8_t[NUM_PIXELS];
        outputUBuffer_ = new uint8_t[NUM_PIXELS];
        outputVBuffer_ = new uint8_t[NUM_PIXELS];
    }

    VonageUnityVideoTransformer::~VonageUnityVideoTransformer() {
        delete[] inputArgbBuffer_;
        delete[] outputYBuffer_;
        delete[] outputUBuffer_;
        delete[] outputVBuffer_;
        
    }

    void VonageUnityVideoTransformer::Transform(webrtc::VideoFrame* target_frame) {
        if (target_frame == nullptr) {
            RTC_LOG_T_F(LS_WARNING) << "Video frame is null";
            return;
        }

        
        rtc::scoped_refptr<webrtc::VideoFrameBuffer> buffer(target_frame->video_frame_buffer());
        
        auto i420Buffer = buffer->ToI420();
        
        libyuv::I420ToARGB(i420Buffer->DataY(),
                           i420Buffer->StrideY(),
                           i420Buffer->DataU(),
                           i420Buffer->StrideU(),
                           i420Buffer->DataV(),
                           i420Buffer->StrideV(),
                           (uint8_t*)inputArgbBuffer_,
                           target_frame->width() * 4,
                           target_frame->width(),
                           target_frame->height());
        
        [NSClassFromString(@"FrameworkLibAPI") setInputBufferCpp: inputArgbBuffer_];
        
        auto outputArgbBuffer = [NSClassFromString(@"FrameworkLibAPI") getOutputBufferCpp];
        
        if(outputArgbBuffer != NULL)
        {
            libyuv::ARGBToI420((uint8_t*)outputArgbBuffer,
                               target_frame->width() * 4,
                               outputYBuffer_,
                               i420Buffer->StrideY(),
                               outputUBuffer_,
                               i420Buffer->StrideU(),
                               outputVBuffer_,
                               i420Buffer->StrideV(),
                               target_frame->width(),
                               target_frame->height());
            
            target_frame->set_video_frame_buffer(webrtc::I420Buffer::Copy(target_frame->width(),
                                                                          target_frame->height(),
                                                                          outputYBuffer_,
                                                                          i420Buffer->StrideY(),
                                                                          outputUBuffer_,
                                                                          i420Buffer->StrideU(),
                                                                          outputVBuffer_,
                                                                          i420Buffer->StrideV()));
        }
    }
}
