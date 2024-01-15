#import "Renderer.h"

#include <UnityFramework/NativeCallProxy.h>

#include <api/video/i420_buffer.h>
#include "api/video/nv12_buffer.h"
#include <api/video/video_frame.h>

#import <sdk/objc/components/renderer/metal/RTCMTLRenderer.h>
#import <sdk/objc/components/renderer/metal/RTCMTLI420Renderer.h>
#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>
#import <sdk/objc/native/api/video_frame.h>

#include <libyuv.h>

#include "AppDelegate.h"

namespace vonage {
    int GetRotation(OTVideoOrientation rotation){
        switch (rotation) {
            case OTVideoOrientationUp:
                return 0;
            case OTVideoOrientationLeft:
                return 90;
            case OTVideoOrientationDown:
                return 180;
            case OTVideoOrientationRight:
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

    webrtc::VideoRotation GetWebRTCRotation(OTVideoOrientation rotation){
        switch (rotation) {
            case OTVideoOrientationUp:
                return webrtc::VideoRotation::kVideoRotation_0;
            case OTVideoOrientationLeft:
                return webrtc::VideoRotation::kVideoRotation_90;
            case OTVideoOrientationDown:
                return webrtc::VideoRotation::kVideoRotation_180;
            case OTVideoOrientationRight:
                return webrtc::VideoRotation::kVideoRotation_270;
            default:
                break;
        }
        return webrtc::VideoRotation::kVideoRotation_0;
    }
}

@interface Renderer ()
@property(nonatomic, weak) id<RTC_OBJC_TYPE(RTCMTLRenderer)> renderer;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* videoView;
@property(nonatomic, weak) id<RendererDelegate> delegate;
@end

@implementation Renderer {
    BOOL _renderingEnabled;
}

@synthesize delegate = _delegate;

#pragma mark - Public

- (BOOL)mirroring {
    return YES;
}

- (void)setMirroring:(BOOL)mirroring {
}

- (BOOL)renderingEnabled {
    return YES;
}

- (void)setRenderingEnabled:(BOOL)renderingEnabled {
}

- (void)clearRenderBuffer {
}

#pragma mark - OTVideoRender

- (void)renderVideoFrame:(OTVideoFrame*)frame {
    if ([_delegate respondsToSelector:@selector(renderer:didReceiveFrame:)]) {
        [_delegate renderer:self didReceiveFrame:frame];
    }
    if (frame == nil) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame frame is null", self);
        return;
    }
//    NSLog(@"[holo]: Renderer %p renderVideoFrame frame width is %u", self, frame.format.imageWidth);
//    NSLog(@"[holo]: Renderer %p renderVideoFrame frame heigth is %u", self, frame.format.imageHeight);
    rtc::scoped_refptr<webrtc::VideoFrameBuffer> inputWebrtcVideoFrameBuffer = webrtc::I420Buffer::Copy(frame.format.imageWidth,
                                                                                                        frame.format.imageHeight,
                                                                                                        static_cast<uint8_t*>([frame.planes pointerAtIndex:0]),
                                                                                                        [frame getPlaneStride:0],
                                                                                                        static_cast<uint8_t*>([frame.planes pointerAtIndex:1]),
                                                                                                        [frame getPlaneStride:1],
                                                                                                        static_cast<uint8_t*>([frame.planes pointerAtIndex:2]),
                                                                                                        [frame getPlaneStride:2]);
    if (inputWebrtcVideoFrameBuffer.get() == nullptr) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame inputWebrtcVideoFrameBuffer is null", self);
        return;
    }
    uint32_t inputWidth = 0;
    uint32_t inputHeigth = 0;
    [FrameworkLibAPI getInputWidth:inputWidth height:inputHeigth];
//    NSLog(@"[holo]: Renderer %p renderVideoFrame inputWidth is %u and inputHeigth is %u", self, inputWidth, inputHeigth);
    if ((inputWidth == 0) || (inputHeigth == 0)) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame inputWidth is %u and inputHeigth is %u", self, inputWidth, inputHeigth);
        return;
    }
    if ((inputWidth != frame.format.imageWidth) || (inputHeigth != frame.format.imageHeight)) {
        inputWebrtcVideoFrameBuffer = inputWebrtcVideoFrameBuffer->Scale(inputWidth, inputHeigth);
    }
    uint32_t inputNumBytes = inputWidth * inputHeigth * 4;
    std::unique_ptr<uint8_t[]> argbInData = std::make_unique<uint8_t[]>(inputNumBytes);
    webrtc::I420BufferInterface* ptr = reinterpret_cast<webrtc::I420BufferInterface*>(inputWebrtcVideoFrameBuffer.get());
    if (ptr == nullptr) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame webrtc::I420BufferInterface ptr is null", self);
        return;
    }
    int retval = libyuv::I420ToARGB(ptr->DataY(),
                                    ptr->StrideY(),
                                    ptr->DataU(),
                                    ptr->StrideU(),
                                    ptr->DataV(),
                                    ptr->StrideV(),
                                    argbInData.get(),
                                    inputWidth * 4,
                                    inputWidth,
                                    inputHeigth);
    if (retval) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame libyuv::I420ToARGB call failed", self);
        return;
    }
    NSData *data = [frame metadata];
//    NSLog(@"[holo]: Renderer %p renderVideoFrame frame augmented data ptr is %p and size is %lu", self, data.bytes, static_cast<size_t>(data.length));
    [FrameworkLibAPI setInputBufferCpp:argbInData.get()
                               rgbSize:(inputNumBytes)
                       augmentedBuffer:static_cast<uint8_t*>(const_cast<void*>(data.bytes))
                         augmentedSize:static_cast<uint32_t>(data.length)
                              rotation:static_cast<uint32_t>(vonage::GetRotation([frame orientation]))];
    [gUfw sendMessageToGOWithName:"ExampleBridge" functionName:"SetTexture" message:""];
    std::unique_ptr<uint8_t[]> argbOutputData;
    uint32_t argbOutputDataSize = 0;
    [FrameworkLibAPI getOutputBufferCpp:argbOutputData size:argbOutputDataSize];
//    NSLog(@"[holo]: Renderer %p renderVideoFrame argbOutputData ptr is %p and argbOutputDataSize is %u", self, argbOutputData.get(), argbOutputDataSize);
    if ((argbOutputData.get() == nullptr) || (argbOutputDataSize == 0)) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame argbOutputData ptr is %p and argbOutputDataSize is %u", self, argbOutputData.get(), argbOutputDataSize);
        return;
    }
    uint32_t outputWidth = 0;
    uint32_t outputHeigth = 0;
    uint8_t outputRotation = 0;
    [FrameworkLibAPI getOutputWidth:outputWidth height:outputHeigth rotation:outputRotation];
//    NSLog(@"[holo]: Renderer %p renderVideoFrame outputWidth is %u and outputHeigth is %u", self, outputWidth, outputHeigth);
    if ((outputWidth == 0) || (outputHeigth == 0)) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame outputWidth is %u and outputHeigth is %u", self, outputWidth, outputHeigth);
        return;
    }
    rtc::scoped_refptr<webrtc::I420Buffer> outputWebrtcVideoFrameBuffer = webrtc::I420Buffer::Create(outputWidth, outputHeigth);
    if (outputWebrtcVideoFrameBuffer.get() == nullptr) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame outputWebrtcVideoFrameBuffer is null", self);
        return;
    }
    retval = libyuv::ARGBToI420(argbOutputData.get(),
                                outputWidth * 4,
                                outputWebrtcVideoFrameBuffer->MutableDataY(),
                                outputWebrtcVideoFrameBuffer->StrideY(),
                                outputWebrtcVideoFrameBuffer->MutableDataU(),
                                outputWebrtcVideoFrameBuffer->StrideU(),
                                outputWebrtcVideoFrameBuffer->MutableDataV(),
                                outputWebrtcVideoFrameBuffer->StrideV(),
                                outputWidth,
                                outputHeigth);
    if (retval) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame libyuv::ARGBToI420 call failed", self);
        return;
    }
    webrtc::VideoFrame outputWebrtcVideoFrame = webrtc::VideoFrame::Builder()
        .set_rotation(vonage::GetRotation(outputRotation))
        .set_video_frame_buffer(outputWebrtcVideoFrameBuffer)
        .set_timestamp_ms(CMTimeGetSeconds([frame timestamp]) * 1000)
        .build();
    if (_videoView) {
        [_videoView renderFrame:webrtc::NativeToObjCVideoFrame(outputWebrtcVideoFrame)];
    }
}

- (void)updateInnerRenderer:(nullable id<VGRTCMTLRenderer>)renderer {
    self.renderer = renderer;
}

- (void)updateDelegate:(nullable id<RendererDelegate>)delegate {
    self.delegate = delegate;
}

- (void)updateView:(nullable VGRTCMTLVideoView *)videoView {
    self.videoView = videoView;
}

@end
