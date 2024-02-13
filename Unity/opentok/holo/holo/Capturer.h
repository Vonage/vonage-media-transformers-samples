#import <OpenTok/OpenTok.h>

#import <sdk/objc/base/RTCMacros.h>
#import <sdk/objc/base/RTCVideoCapturer.h>
#import <sdk/objc/base/RTCVideoRenderer.h>

@protocol OTVideoCapture;

@interface Capturer : NSObject
<OTVideoCapture, RTC_OBJC_TYPE(RTCVideoCapturerDelegate)>
{
@protected
    dispatch_queue_t _capture_queue;
}
-(instancetype)initWithCapturePreset: (NSString*)preset andDelegate:(id<RTC_OBJC_TYPE(RTCVideoRenderer)>) dlegate;
-(void)startCaptureCompletionHandler:(void(^)(NSError *))completionHandler;
@end
