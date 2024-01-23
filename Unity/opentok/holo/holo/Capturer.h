#import <OpenTok/OpenTok.h>

#import <sdk/objc/base/RTCMacros.h>
#import <sdk/objc/base/RTCVideoCapturer.h>

@protocol OTVideoCapture;

@interface Capturer : NSObject
<OTVideoCapture, RTC_OBJC_TYPE(RTCVideoCapturerDelegate)>
{
@protected
    dispatch_queue_t _capture_queue;
}

-(id)initWithCapturePreset: (NSString*)preset;

@end
