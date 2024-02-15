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

#import <AugmentedCompression.h>

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
}

@interface Renderer ()
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* videoView;
@property (nonatomic, weak) id<RendererDelegate> delegate;
@end

@implementation Renderer {
    UnityFramework* _unity;
    int64_t _current_timestamp;
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

- (instancetype)initWithUnity:(nonnull UnityFramework *)unity {
    self = [super init];
    if(self){
        _current_timestamp = 0;
        _unity = unity;
    }
    return self;
}

- (void)renderVideoFrame:(OTVideoFrame*)frame {
    if ([_delegate respondsToSelector:@selector(renderer:didReceiveFrame:)]) {
        [_delegate renderer:self didReceiveFrame:frame];
    }
    if (frame == nil) {
        NSLog(@"[holo]: Renderer %p renderVideoFrame frame is null", self);
        return;
    }
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
    [FrameworkLibAPI setInputBufferCpp:argbInData.get()
                               rgbSize:inputNumBytes
                       augmentedBuffer:(uint32_t)data.length > 0 ? (uint8_t*)(data.bytes) : nullptr
                         augmentedSize:(uint32_t)data.length
                              rotation:static_cast<uint32_t>(vonage::GetRotation([frame orientation]))];
    [_unity sendMessageToGOWithName:"ExampleBridge" functionName:"SetTexture" message:""];
    return;
}

- (void)updateDelegate:(nullable id<RendererDelegate>)delegate {
    self.delegate = delegate;
}

- (void)updateView:(nullable RTC_OBJC_TYPE(RTCMTLVideoView)*)videoView {
    self.videoView = videoView;
}

@end
