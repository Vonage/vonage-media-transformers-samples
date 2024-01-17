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

@property (nonatomic, assign) NSString* captureSessionPreset;
@property (readonly) NSArray* availableCaptureSessionPresets;

@property (nonatomic, assign) double activeFrameRate;
- (BOOL)isAvailableActiveFrameRate:(double)frameRate;

@property (nonatomic, assign) AVCaptureDevicePosition cameraPosition;
@property (readonly) NSArray* availableCameraPositions;
- (BOOL)toggleCameraPosition;

@end
