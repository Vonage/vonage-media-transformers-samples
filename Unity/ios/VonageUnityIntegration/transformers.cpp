#include "transformers.h"
#include "AppDelegate.h"

#include <api/audio/audio_frame.h>
#include <api/video/i420_buffer.h>
#include <api/video/video_frame.h>
#include <rtc_base/logging.h>
#include <rtc_base/time_utils.h>
#include <modules/video_coding/codecs/multiplex/include/augmented_video_frame_buffer.h>

#include <third_party/libyuv/include/libyuv.h>
#include <UnityFramework/NativeCallProxy.h>
#include <numeric>

namespace vonage {

    int GetRotation(webrtc::VideoRotation rotation){
        switch (rotation) {
            case webrtc::VideoRotation::kVideoRotation_0:
                return 0;
            case webrtc::VideoRotation::kVideoRotation_90:
                return 90;
            case webrtc::VideoRotation::kVideoRotation_180:
                return 180;
            case webrtc::VideoRotation::kVideoRotation_270:
                return 270;
            default:
                break;
        }
        return 0;
    }

    webrtc::VideoRotation GetRotation(int rotation){
        switch (rotation) {
            case 0:
                return webrtc::VideoRotation::kVideoRotation_0;
            case 90:
                return webrtc::VideoRotation::kVideoRotation_90;
            case 180:
                return webrtc::VideoRotation::kVideoRotation_180;
            case 270:
                return webrtc::VideoRotation::kVideoRotation_270;
        }
        return webrtc::VideoRotation::kVideoRotation_0;
    }

    // VonageUnityVideoTransformer
    VonageUnityVideoTransformer::VonageUnityVideoTransformer(webrtc::BaseFrameTransformerObserver* observer, std::shared_ptr<DecompressAugmentedData> decompressor, bool unity_rendering_enabled, UnityFramework* unity_framework) : webrtc::BaseFrameTransformer<webrtc::VideoFrame>(observer), decompressor_(decompressor), unity_rendering_enabled_(unity_rendering_enabled), unity_framework_(unity_framework){
    }

    VonageUnityVideoTransformer::~VonageUnityVideoTransformer() {
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
        
        uint32_t input_width = 0;
        uint32_t input_heigth = 0;
        uint32_t input_num_bytes = 0;
        [FrameworkLibAPI getInputWidth:input_width height:input_heigth];
        if(input_width == 0 || input_heigth == 0){
            return;
        }
        input_num_bytes = input_width * input_heigth * 4;
        rtc::scoped_refptr<webrtc::VideoFrameBuffer> org_buffer(target_frame->video_frame_buffer());
        rtc::scoped_refptr<webrtc::I420BufferInterface> i420Buffer;
        if(org_buffer->width() != input_width || org_buffer->height() != input_heigth){
            i420Buffer = org_buffer->Scale(input_width, input_heigth)->ToI420();
        }else{
            i420Buffer = org_buffer->ToI420();
        }
        
        std::unique_ptr<uint8_t[]> in_argb_data = std::make_unique<uint8_t[]>(input_num_bytes);
        
        // Convert video frame buffer from YUV to ARGB buffer to be used by Unity
        libyuv::I420ToARGB(i420Buffer->DataY(),
                           i420Buffer->StrideY(),
                           i420Buffer->DataU(),
                           i420Buffer->StrideU(),
                           i420Buffer->DataV(),
                           i420Buffer->StrideV(),
                           in_argb_data.get(),
                           input_width * 4,
                           input_width,
                           input_heigth);
        
        int64_t start = rtc::TimeNanos();
        webrtc::AugmentedVideoFrameBuffer* augemnted_video_frame = static_cast<webrtc::AugmentedVideoFrameBuffer*>(target_frame->video_frame_buffer().get());
        [FrameworkLibAPI setInputBufferCpp:in_argb_data.get() rgbSize:(input_num_bytes) augmentedBuffer:augemnted_video_frame->GetAugmentingData() augmentedSize:augemnted_video_frame->GetAugmentingDataSize() rotation:GetRotation(target_frame->rotation())];
        // Tell Unity to update texture rendering using the updated input buffer
        [unity_framework_ sendMessageToGOWithName:"ExampleBridge" functionName:"SetTexture" message:""];
         
        time_gap_.emplace_back(rtc::TimeNanos() - start);
        
        if(time_gap_.size() % 300 == 0){
            int64_t sum = std::accumulate(time_gap_.begin(), time_gap_.end(), 0);
            printf("mini123 avg: %.5f size: %zu\r\n", (double)sum / time_gap_.size(), time_gap_.size());
        }
        
        if(unity_rendering_enabled_){
            return;
        }
        
        //Get Unity 3D scene rendering as ARGB buffer
        std::unique_ptr<uint8_t[]> out_argb_data;
        uint32_t out_size = 0;
        [FrameworkLibAPI getOutputBufferCpp:out_argb_data size:out_size];
      
        if(out_argb_data && out_size > 0)
        {
            uint32_t output_width = 0;
            uint32_t output_heigth = 0;
            uint8_t output_rotation = 0;
            [FrameworkLibAPI getOutputWidth:output_width height:output_heigth rotation:output_rotation];
            if(output_width == 0 || output_heigth == 0){
                return;
            }
            target_frame->set_rotation(GetRotation(output_rotation));
            rtc::scoped_refptr<webrtc::I420Buffer> output_video_frame_buffer = webrtc::I420Buffer::Create(output_width, output_heigth);
            //Convert 3D scene ARGB buffer received from Unity to YUV
            libyuv::ARGBToI420(out_argb_data.get(),
                               output_width * 4,
                               output_video_frame_buffer->MutableDataY(),
                               output_video_frame_buffer->StrideY(),
                               output_video_frame_buffer->MutableDataU(),
                               output_video_frame_buffer->StrideU(),
                               output_video_frame_buffer->MutableDataV(),
                               output_video_frame_buffer->StrideV(),
                               output_width,
                               output_heigth);
            target_frame->set_video_frame_buffer(output_video_frame_buffer);
        }
    }
}
