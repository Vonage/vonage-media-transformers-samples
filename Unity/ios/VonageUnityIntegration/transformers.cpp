#include "transformers.h"
#include "AppDelegate.h"

#include <api/audio/audio_frame.h>
#include <api/video/i420_buffer.h>
#include <api/video/video_frame.h>
#include <rtc_base/logging.h>
#include <third_party/libyuv/include/libyuv.h>
#include <UnityFramework/NativeCallProxy.h>

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


/*
    -----------------------------------------------------------------------------------------------------------------------------------------------------
    |   In this function we send the video frame to be rendered by Unity through the following steps:                                                   |
    |   1- Get YUV frame buffer and convert it to ARGB buffer                                                                                           |
    |   2- Send ARGB buffer to unity as input buffer                                                                                                    |
    |   3- Tell Unity to update texture rendering using the input buffer that Unity received from us.                                                   |
    |   4- Get Unity 3D scene rendering as ARGB buffer                                                                                                  |
    |   5- Convert ARGB buffer received from Unity to YUV and update ios app video frame buffer with the converted YUV buffer                           |
    -----------------------------------------------------------------------------------------------------------------------------------------------------
 */
    void VonageUnityVideoTransformer::Transform(webrtc::VideoFrame* target_frame) {
        if (target_frame == nullptr) {
            RTC_LOG_T_F(LS_WARNING) << "Video frame is null";
            return;
        }

        
        rtc::scoped_refptr<webrtc::VideoFrameBuffer> buffer(target_frame->video_frame_buffer());
        
        auto i420Buffer = buffer->ToI420();
        
        // Convert video frame buffer from YUV to ARGB buffer to be used by Unity
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
        
        // Send converted ARGB video frame buffer to Unity
        [NSClassFromString(@"FrameworkLibAPI") setInputBufferCpp: inputArgbBuffer_];
      
        // Tell Unity to update texture rendering using the updated input buffer
        [gUfw sendMessageToGOWithName:"ExampleBridge" functionName:"SetTexture" message:""];
         
        //Get Unity 3D scene rendering as ARGB buffer
        auto outputArgbBuffer = [NSClassFromString(@"FrameworkLibAPI") getOutputBufferCpp];
      
        if(outputArgbBuffer != NULL)
        {
            //Convert 3D scene ARGB buffer received from Unity to YUV
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
            
            //Update video frame buffer with the converted YUV buffer 
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