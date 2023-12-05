#include "transformers.h"
#include "AppDelegate.h"

#include <api/audio/audio_frame.h>
#include <api/video/i420_buffer.h>
#include <api/video/video_frame.h>
#include <rtc_base/logging.h>
#include <modules/video_coding/codecs/multiplex/include/augmented_video_frame_buffer.h>

#include <third_party/libyuv/include/libyuv.h>
#include <UnityFramework/NativeCallProxy.h>

#define UNITY_WIDTH 640
#define UNITY_HEIGHT 480

#define NUM_PIXELS UNITY_WIDTH * UNITY_HEIGHT

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
    // VonageUnityVideoTransformer
    VonageUnityVideoTransformer::VonageUnityVideoTransformer(webrtc::BaseFrameTransformerObserver* observer, std::shared_ptr<DecompressAugmentedData> decompressor) : webrtc::BaseFrameTransformer<webrtc::VideoFrame>(observer), decompressor_(decompressor){
    }

    VonageUnityVideoTransformer::~VonageUnityVideoTransformer() {
    }

    bool VonageUnityVideoTransformer::SetTransformerConfig(const vonage::MLTransformerBaseConfig *config){
        return true;
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
        std::unique_ptr<uint8_t[]> augmented_data;
        uint32_t augmented_size = 0;
        if(decompressor_ && target_frame->video_frame_buffer()->IsAugmented()){
            webrtc::AugmentedVideoFrameBuffer* augemnted_video_frame = static_cast<webrtc::AugmentedVideoFrameBuffer*>(target_frame->video_frame_buffer().get());
            if(!decompressor_->decompress(augemnted_video_frame->GetAugmentingData(), augemnted_video_frame->GetAugmentingDataSize(), augmented_data, augmented_size)){
                
            }
        }
        rtc::scoped_refptr<webrtc::VideoFrameBuffer> org_buffer(target_frame->video_frame_buffer());
        rtc::scoped_refptr<webrtc::I420BufferInterface> i420Buffer;
        if(org_buffer->width() != UNITY_WIDTH || org_buffer->height() != UNITY_HEIGHT){
            i420Buffer = org_buffer->Scale(UNITY_WIDTH, UNITY_HEIGHT)->ToI420();
        }else{
            i420Buffer = org_buffer->ToI420();
        }
        
        std::unique_ptr<uint8_t[]> in_argb_data = std::make_unique<uint8_t[]>(NUM_PIXELS * 4);
        
        // Convert video frame buffer from YUV to ARGB buffer to be used by Unity
        libyuv::I420ToARGB(i420Buffer->DataY(),
                           i420Buffer->StrideY(),
                           i420Buffer->DataU(),
                           i420Buffer->StrideU(),
                           i420Buffer->DataV(),
                           i420Buffer->StrideV(),
                           in_argb_data.get(),
                           UNITY_WIDTH * 4,
                           UNITY_WIDTH,
                           UNITY_HEIGHT);
        
        // Send converted ARGB video frame buffer to Unity
        [FrameworkLibAPI setInputBufferCpp:(uint32_t*)in_argb_data.get() rgbSize:NUM_PIXELS augmentedBuffer:augmented_data.get() augmentedSize:augmented_size rotation:GetRotation(target_frame->rotation())];
        // Tell Unity to update texture rendering using the updated input buffer
        [gUfw sendMessageToGOWithName:"ExampleBridge" functionName:"SetTexture" message:""];
         
        //Get Unity 3D scene rendering as ARGB buffer
        std::unique_ptr<uint32_t[]> out_argb_data;
        uint32_t out_size = 0;
        [FrameworkLibAPI getOutputBufferCpp:out_argb_data size:out_size];
      
        if(out_argb_data && out_size > 0)
        {
            target_frame->set_rotation(webrtc::VideoRotation::kVideoRotation_90);
            rtc::scoped_refptr<webrtc::I420Buffer> output_video_frame_buffer = webrtc::I420Buffer::Create(UNITY_WIDTH, UNITY_HEIGHT);
            //Convert 3D scene ARGB buffer received from Unity to YUV
            libyuv::ARGBToI420((uint8_t*)out_argb_data.get(),
                               UNITY_WIDTH * 4,
                               output_video_frame_buffer->MutableDataY(),
                               output_video_frame_buffer->StrideY(),
                               output_video_frame_buffer->MutableDataU(),
                               output_video_frame_buffer->StrideU(),
                               output_video_frame_buffer->MutableDataV(),
                               output_video_frame_buffer->StrideV(),
                               UNITY_WIDTH,
                               UNITY_HEIGHT);
            //Update video frame buffer with the converted YUV buffer
            if(org_buffer->width() != UNITY_WIDTH || org_buffer->height() != UNITY_HEIGHT){
                target_frame->set_video_frame_buffer(output_video_frame_buffer->Scale(org_buffer->width(), org_buffer->height()));
            }else{
                target_frame->set_video_frame_buffer(output_video_frame_buffer);
            }
        }
    }
}
