#include "transformers.h"
#include "AppDelegate.h"

#include <api/audio/audio_frame.h>
#include <api/video/i420_buffer.h>
#include <api/video/video_frame.h>
#include <rtc_base/logging.h>
#include <modules/video_coding/codecs/multiplex/include/augmented_video_frame_buffer.h>

#include <third_party/libyuv/include/libyuv.h>
#include <UnityFramework/NativeCallProxy.h>

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
        uint32_t input_width = 0;
        uint32_t input_heigth = 0;
        uint32_t input_num_pixels = 0;
        [FrameworkLibAPI getInputWidth:input_width height:input_heigth];
        if(input_width == 0 || input_heigth == 0){
            return;
        }
        input_num_pixels = input_width * input_heigth;
        rtc::scoped_refptr<webrtc::VideoFrameBuffer> org_buffer(target_frame->video_frame_buffer());
        rtc::scoped_refptr<webrtc::I420BufferInterface> i420Buffer;
        if(org_buffer->width() != input_width || org_buffer->height() != input_heigth){
            i420Buffer = org_buffer->Scale(input_width, input_heigth)->ToI420();
        }else{
            i420Buffer = org_buffer->ToI420();
        }
        
        std::unique_ptr<uint8_t[]> in_argb_data = std::make_unique<uint8_t[]>(input_num_pixels * 4);
        
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
        
        // Send converted ARGB video frame buffer to Unity
        [FrameworkLibAPI setInputBufferCpp:(uint32_t*)in_argb_data.get() rgbSize:input_num_pixels augmentedBuffer:augmented_data.get() augmentedSize:augmented_size rotation:GetRotation(target_frame->rotation())];
        // Tell Unity to update texture rendering using the updated input buffer
        [gUfw sendMessageToGOWithName:"ExampleBridge" functionName:"SetTexture" message:""];
         
        //Get Unity 3D scene rendering as ARGB buffer
        std::unique_ptr<uint32_t[]> out_argb_data;
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
            libyuv::ARGBToI420((uint8_t*)out_argb_data.get(),
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
