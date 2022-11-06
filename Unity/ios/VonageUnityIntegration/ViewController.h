//
//  ViewController.h
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import <UIKit/UIKit.h>
#import <sdk/objc/native/api/video_renderer.h>
#import "RTCFakeCameraVideoCapturer.h"

@interface ViewController : UIViewController

@property(nonatomic, readonly) RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer) * capturer;
@property(nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* remoteVideoView;

@end

