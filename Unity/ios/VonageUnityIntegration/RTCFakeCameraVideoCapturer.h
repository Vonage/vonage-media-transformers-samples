//
//  RTCFakeCameraVideoCapturer.h
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-17.
//

#import <Foundation/Foundation.h>

#import "RTCMacros.h"
#import "RTCVideoCapturer.h"

NS_ASSUME_NONNULL_BEGIN

RTC_OBJC_EXPORT

@interface RTC_OBJC_TYPE (RTCFakeCameraVideoCapturer) : RTC_OBJC_TYPE(RTCVideoCapturer)

- (id) init;
- (void)startCapture;
- (void)stopCapture;

@end

NS_ASSUME_NONNULL_END
