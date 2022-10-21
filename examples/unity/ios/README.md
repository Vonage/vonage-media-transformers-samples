# Insertable Streams iOS Unity sample
This sample application shows how to integrate insertable streams (video) with unity.
Integrating this sample with **Vonage Video SDK** will allow you to publish a unity scene as your video. 

### Prerequisite:
 - Unity - this sample was built with Unity *2021.3.6f1* (make sure ios is installed)

### Building Unity:
- From file meny select build settings.
- Select iOS from platform list.
- Build unity project for iOS.
- copy all generated build files and place them in this directory (clear the directory if not empty):
vonage-media-transformers-samples/examples/unity/ios/Unity-iPhone/

### Building the app:
- Open vonage-media-transformers-samples/examples/unity/ios/iOSObjCApp.xcworkspace with xcode.
- In Unity-iPhone project, change target of Data directory to UnityFramework.
- In Pods project do the following in all targets build settings:
    
    go to Build Settings -> Architectures -> Debug -> Click plus sign  (+) select "Any iOS Simulator SDK" and set the architecture to "x86_64" only. 
- Build the target UnityFramework.
- Run target iOSObjCApp on ios simulator.

## Key points for Unity iOS integration

The main iOS app code that communicates with Unity is located in file transformers.cpp that contains insertable stream implementation in Unity video transformer class:

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

