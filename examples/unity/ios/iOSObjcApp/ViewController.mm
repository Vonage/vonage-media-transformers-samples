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

@interface ViewController ()
@property(nonatomic) RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer) * capturer;
@property(nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* localVideoView;

@end

@implementation ViewController {
    UIView *_view;
    std::unique_ptr<WebRTCHelper> _webrtcHelper;
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

    [_localVideoView.leadingAnchor constraintEqualToAnchor:margin.leadingAnchor constant:8.0].active = YES;
    [_localVideoView.topAnchor constraintEqualToAnchor:margin.topAnchor constant:8.0].active = YES;
    [_localVideoView.widthAnchor constraintEqualToConstant:60].active = YES;
    [_localVideoView.heightAnchor constraintEqualToConstant:60].active = YES;
    
    self->_webrtcHelper = std::make_unique<WebRTCHelper>();
    
    self.view = _view;
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    
    self.capturer = [[RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer) alloc] init];
    
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink = webrtc::ObjCToNativeVideoRenderer(self->_localVideoView);
    rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_track_source = webrtc::ObjCToNativeVideoCapturer(_capturer, _webrtcHelper->getSignalingThread(), _webrtcHelper->getWorkerThread());
    
    [self.capturer startCaptureWithFps];
    
    self->_webrtcHelper->init(video_track_source.get(), std::move(local_sink));
}


@end
