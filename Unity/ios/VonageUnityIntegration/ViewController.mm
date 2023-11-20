//
//  ViewController.m
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import "ViewController.h"
#import "RTCFakeCameraVideoCapturer.h"
#include "WebRTCHelper.hpp"
#include <sdk/objc/native/api/video_capturer.h>
#include <sdk/objc/native/api/video_renderer.h>
#include <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>
#include <sdk/objc/components/capturer/RTCCameraVideoCapturer.h>
#import "RTCFakeCameraVideoCapturer.h"

@interface ViewController ()
@property(nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* localVideoView;

@end

@implementation ViewController {
    UIView *_view;
    std::unique_ptr<WebRTCHelper> _webrtcHelper;
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> _local_sink;
}

@synthesize capturer = _capturer;
@synthesize localVideoView = _localVideoView;

- (void)viewDidLoad {
    [super viewDidLoad];
    _view = [[UIView alloc] initWithFrame:CGRectZero];

    _localVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectZero];
    _localVideoView.translatesAutoresizingMaskIntoConstraints = NO;
    [_view addSubview:_localVideoView];

    UILayoutGuide *margin = _view.layoutMarginsGuide;
    [_localVideoView.leadingAnchor constraintEqualToAnchor:margin.leadingAnchor].active = YES;
    [_localVideoView.topAnchor constraintEqualToAnchor:margin.topAnchor].active = YES;
    [_localVideoView.trailingAnchor constraintEqualToAnchor:margin.trailingAnchor].active = YES;
    [_localVideoView.bottomAnchor constraintEqualToAnchor:margin.bottomAnchor].active = YES;
    
    self->_webrtcHelper = std::make_unique<WebRTCHelper>();
    
    self.view = _view;
  
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)) , dispatch_get_main_queue(), ^() {
#if TARGET_OS_SIMULATOR
        self.capturer = [[RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer) alloc] init];
#else
        self.capturer = [[RTC_OBJC_TYPE(RTCCameraVideoCapturer) alloc] init];
#endif
        self->_local_sink = webrtc::ObjCToNativeVideoRenderer(self->_localVideoView);
        if([self->_capturer isKindOfClass:[RTC_OBJC_TYPE(RTCCameraVideoCapturer) class]]){
            RTC_OBJC_TYPE(RTCCameraVideoCapturer)* local_capturer = (RTC_OBJC_TYPE(RTCCameraVideoCapturer)*)self->_capturer;
            AVCaptureDevice *selectedDevice = nil;
            NSArray<AVCaptureDevice *> *captureDevices = [RTC_OBJC_TYPE(RTCCameraVideoCapturer) captureDevices];
            for (AVCaptureDevice *device in captureDevices) {
                if (device.position == AVCaptureDevicePositionFront){
                    selectedDevice = device;
                    break;
                }
                
            }
            
            AVCaptureDeviceFormat *selectedFormat = nil;
            int targetWidth = 640;
            int targetHeight = 480;
            int currentDiff = INT_MAX;
            NSArray<AVCaptureDeviceFormat *> *formats = [RTC_OBJC_TYPE(RTCCameraVideoCapturer) supportedFormatsForDevice:selectedDevice];
            for (AVCaptureDeviceFormat *format in formats) {
                CMVideoDimensions dimension = CMVideoFormatDescriptionGetDimensions(format.formatDescription);
                bool isCorrectFps = false;
                for(AVFrameRateRange* frameRate in format.videoSupportedFrameRateRanges){
                    if(frameRate.maxFrameRate == 30){
                        isCorrectFps = true;
                        break;
                    }
                }
                if(isCorrectFps){
                    int diff = abs(targetWidth - dimension.width) + abs(targetHeight - dimension.height);
                    if (diff < currentDiff) {
                        selectedFormat = format;
                        currentDiff = diff;
                    }
                }
            }
            NSError* error;
            AVCaptureDeviceInput* device_input = [AVCaptureDeviceInput deviceInputWithDevice:selectedDevice error:&error];
            [local_capturer startCaptureWithDevice:selectedDevice format:selectedFormat input:device_input fps:30 completionHandler:^(NSError * _Nullable error) {
                if(!error){
                    rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_track_source = webrtc::ObjCToNativeVideoCapturer(self->_capturer, self->_webrtcHelper->getSignalingThread(), self->_webrtcHelper->getWorkerThread());
                    self->_webrtcHelper->init(video_track_source.get(), std::move(self->_local_sink));
                }
            }];
        } else {
            RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer)* local_capturer = (RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer)*)self->_capturer;
            [local_capturer stopCapture];
            rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_track_source = webrtc::ObjCToNativeVideoCapturer(self->_capturer, self->_webrtcHelper->getSignalingThread(), self->_webrtcHelper->getWorkerThread());
            self->_webrtcHelper->init(video_track_source.get(), std::move(self->_local_sink));
        }
    });
}


@end
