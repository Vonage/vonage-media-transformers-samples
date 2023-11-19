//
//  ViewController.h
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import <UIKit/UIKit.h>
#import <sdk/objc/native/api/video_renderer.h>
#import <sdk/objc/base/RTCMacros.h>

RTC_FWD_DECL_OBJC_CLASS(RTC_OBJC_TYPE(RTCVideoCapturer));

@interface ViewController : UIViewController

@property(nonatomic) RTC_OBJC_TYPE(RTCVideoCapturer) * capturer;
@property(nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* remoteVideoView;

@end

