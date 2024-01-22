#import "Capturer.h"

#include <memory>

#import <sdk/objc/base/RTCVideoFrameBuffer.h>
#import <sdk/objc/components/video_frame_buffer/RTCCVPixelBuffer.h>
#import <sdk/objc/vonage/capturer/VonageRTCCameraVideoCapturer.h>

#import <AugmentedCompression.h>

typedef NS_ENUM(int32_t, OTCapturerErrorCode) {

    OTCapturerSuccess = 0,

    /** Publisher couldn't access to the camera */
    OTCapturerError = 1650,

    /** Publisher's capturer is not capturing frames */
    OTCapturerNoFramesCaptured = 1660,

    /** Publisher's capturer authorization failed */
    OTCapturerAuthorizationDenied = 1670,
};

@interface DepthDataCompressor : NSObject<RTC_OBJC_TYPE(RTCVideoDepthDataDelegate)>

@end

@implementation DepthDataCompressor

- (BOOL)compressInputArray:(nonnull CVPixelBufferRef)depthDataMap outputArray:(std::unique_ptr<uint8_t[]> &)outputArray outputSize:(uint32_t &)outputSize {
    return Holographic::Compression::compress(depthDataMap, outputArray, outputSize);
}

@end

@interface Capturer()
@property (nonatomic) RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer) *capturer;
@property (nonatomic) DepthDataCompressor *depthDataCompressor;

@end

@implementation Capturer {
    __weak id<OTVideoCaptureConsumer> _videoCaptureConsumer;
    OTVideoFrame* _videoFrame;

    uint32_t _captureWidth;
    uint32_t _captureHeight;
    NSString* _capturePreset;

    BOOL _capturing;

    enum OTCapturerErrorCode _captureErrorCode;
}

@synthesize videoCaptureConsumer = _videoCaptureConsumer;
@synthesize videoContentHint;

-(id)init {
    return [self initWithCapturePreset:AVCaptureSessionPreset640x480];
}

-(id)initWithCapturePreset: (NSString*)preset {
    self = [super init];
    if (self) {
        _capturePreset = preset;
        [[self class] dimensionsForCapturePreset:_capturePreset
                                           width:&_captureWidth
                                          height:&_captureHeight];
        _capture_queue = dispatch_queue_create("com.vonage.holo.Capturer",
                                               DISPATCH_QUEUE_SERIAL);
        _videoFrame = [[OTVideoFrame alloc] initWithFormat:
                       [OTVideoFormat videoFormatNV12WithWidth:_captureWidth
                                                        height:_captureHeight]];
    }
    return self;
}

- (void)dealloc {
    [self stopCapture];
    [self releaseCapture];

    if (_capture_queue) {
        _capture_queue = nil;
    }
    _videoFrame = nil;
}

- (void)initCapture {
    _capturer = [[RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer) alloc] init];
    _depthDataCompressor = [[DepthDataCompressor alloc] init];

    [_capturer setDelegate:self];
    [_capturer updateDepthDelegate:_depthDataCompressor];
}

- (void)releaseCapture {
    [self stopCapture];
}

- (int32_t)startCapture {
    _capturing = YES;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 1 * NSEC_PER_SEC),
                   dispatch_get_global_queue( DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^{
        AVCaptureDeviceType deviceType = AVCaptureDeviceTypeBuiltInTrueDepthCamera;
        AVCaptureDeviceDiscoverySession* deviceDiscoverySession = [AVCaptureDeviceDiscoverySession
                                                                   discoverySessionWithDeviceTypes:@[ deviceType ]
                                                                   mediaType:AVMediaTypeVideo
                                                                   position:AVCaptureDevicePositionFront];
        AVCaptureDevice* selectedDevice =
        [deviceDiscoverySession devices]
        ? [deviceDiscoverySession devices].firstObject
        : [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];

        AVCaptureDeviceFormat *selectedFormat = nil;
        int targetWidth = self->_captureWidth;
        int targetHeight = self->_captureHeight;
        int currentDiff = INT_MAX;
        NSArray<AVCaptureDeviceFormat *> *formats = [RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer) supportedFormatsForDevice:selectedDevice];
        for (AVCaptureDeviceFormat *format in formats) {
            if([format.supportedDepthDataFormats count] == 0){
                continue;
            }
            CMVideoDimensions dimension = CMVideoFormatDescriptionGetDimensions(format.formatDescription);
            bool isCorrectFps = false;
            for(AVFrameRateRange* frameRate in format.videoSupportedFrameRateRanges){
                if(frameRate.maxFrameRate <= 60){
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

        NSArray<AVCaptureDeviceFormat *> *depthFormats = selectedFormat.supportedDepthDataFormats;
        NSArray<AVCaptureDeviceFormat *> *filtered = [depthFormats filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(AVCaptureDeviceFormat *evaluatedObject, NSDictionary<NSString *, id> *bindings) {
            return CMFormatDescriptionGetMediaSubType(evaluatedObject.formatDescription) == kCVPixelFormatType_DepthFloat32 && CMVideoFormatDescriptionGetDimensions(evaluatedObject.formatDescription).width == 640 && CMVideoFormatDescriptionGetDimensions(evaluatedObject.formatDescription).height == 480;
        }]];
        AVCaptureDeviceFormat* depthFormat = nil;
        if([filtered count] == 1){
            depthFormat = filtered[0];
        }
        AVCaptureDeviceInput* videoDeviceInput = [AVCaptureDeviceInput deviceInputWithDevice:selectedDevice error:&error];
        if(error != nil){
            OTError *err = [OTError errorWithDomain:OT_PUBLISHER_ERROR_DOMAIN
                                               code:OTCapturerError
                                           userInfo:nil];
            [self callDelegateOnError:err captureError:nil];
            [self showCapturerError:err];
            return;
        }
        [self->_capturer startWithDevice:selectedDevice format:selectedFormat sessionPreset:self->_capturePreset videoDeviceInput:videoDeviceInput videoMirrored:YES orientation:AVCaptureVideoOrientationPortrait pixelFormat:kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange depthFormat:depthFormat CompletionHandler:^(NSError * _Nullable error) {
            if(error){
                OTError *err = [OTError errorWithDomain:OT_PUBLISHER_ERROR_DOMAIN
                                                   code:OTCapturerError
                                               userInfo:nil];
                [self callDelegateOnError:err captureError:nil];
                [self showCapturerError:err];
            }
        }];
    });
    return 0;
}

- (int32_t)stopCapture {
    _capturing = NO;
    NSCondition *condition = [[NSCondition alloc] init];
    [condition lock];
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^(void){
        [self->_capturer stopWithCompletionHandler:^{
            [condition signal];
        }];
    });
    [condition wait];
    return 0;
}

- (BOOL)isCaptureStarted {
    return _capturing;
}

- (int32_t)captureSettings:(OTVideoFormat*)videoFormat {
    videoFormat.pixelFormat = OTPixelFormatNV12;
    videoFormat.imageWidth = _captureWidth;
    videoFormat.imageHeight = _captureHeight;
    return 0;
}

- (void)updateCaptureFormatWithWidth:(uint32_t)width height:(uint32_t)height {
    _captureWidth = width;
    _captureHeight = height;
    [_videoFrame setFormat:[OTVideoFormat
                            videoFormatNV12WithWidth:_captureWidth
                            height:_captureHeight]];
}

-(void)callDelegateOnError:(OTError*)error captureError:(NSError *)captureError {
    _captureErrorCode = (enum OTCapturerErrorCode)error.code;
}

-(enum OTCapturerErrorCode)captureError {
    return _captureErrorCode;
}

- (void)capturer:(nonnull RTC_OBJC_TYPE(RTCVideoCapturer) *)capturer didCaptureVideoFrame:(nonnull RTC_OBJC_TYPE(RTCVideoFrame) *)videoFrame {
//        NSLog(@"[holo]: Capturer %p capturer New frame captured (width %d and height %d)", self, videoFrame.width, videoFrame.height);

    if ([videoFrame.buffer isKindOfClass:[RTC_OBJC_TYPE(RTCCVPixelBuffer) class]]) {
        CVPixelBufferRef buffer = ((RTC_OBJC_TYPE(RTCCVPixelBuffer) *)videoFrame.buffer).pixelBuffer;
        OTVideoOrientation orientation = OTVideoOrientationUp;
        switch ([videoFrame rotation]) {
            case RTCVideoRotation_0:
                orientation = OTVideoOrientationUp;
                break;
            case RTCVideoRotation_90:
                orientation = OTVideoOrientationLeft;
                break;
            case RTCVideoRotation_180:
                orientation = OTVideoOrientationDown;
                break;
            case RTCVideoRotation_270:
                orientation = OTVideoOrientationRight;
                break;

            default:
                orientation = OTVideoOrientationUp;
                break;
        }
        NSData *data = nil;
        if ([videoFrame isAugmented]) {
            data = [NSData dataWithBytes:[videoFrame augmentingData] length:[videoFrame augmentingDataSize]];
//            NSLog(@"[holo]: Capturer %p capturer augmented data size is %lu", self, static_cast<size_t>(data.length));
        }
        // TODO: Review the way we build the timestamp we provide through CMTimeMake (not sure is correct).
        [_videoCaptureConsumer consumeImageBuffer:buffer
                                      orientation:orientation
                                        timestamp: CMTimeMake([videoFrame timeStampNs], CMTimeScale(NSEC_PER_SEC))
                                         metadata:data];

    }
}

- (void)showCapturerError:(OTError*)error {
    dispatch_async(dispatch_get_main_queue(), ^{
        UIAlertController *alertController = [UIAlertController alertControllerWithTitle:@"[holo] Capturer"
                                                                                 message:[NSString stringWithFormat:
                                                                                          @"Capturer failed with error : %@", error.description]
                                                                          preferredStyle:UIAlertControllerStyleAlert];
        UIAlertAction *actionOk = [UIAlertAction actionWithTitle:@"Ok"
                                                           style:UIAlertActionStyleDefault
                                                         handler:nil];
        [alertController addAction:actionOk];
        [[[UIApplication sharedApplication] delegate].window.rootViewController
         presentViewController:alertController
         animated:YES completion:nil];
    });
}

- (NSString*)captureSessionPreset {
    return _capturePreset;
}

- (void)setCaptureSessionPreset:(NSString*)preset {
}

- (NSArray *)availableCaptureSessionPresets {
    NSArray *allSessionPresets = [NSArray arrayWithObjects:
                                  AVCaptureSessionPreset352x288,
                                  AVCaptureSessionPreset640x480,
                                  AVCaptureSessionPreset1280x720,
                                  AVCaptureSessionPreset1920x1080,
                                  AVCaptureSessionPresetPhoto,
                                  AVCaptureSessionPresetHigh,
                                  AVCaptureSessionPresetMedium,
                                  AVCaptureSessionPresetLow,
                                  nil];
    return allSessionPresets;
}

- (double)activeFrameRate {
    return 30.0;
}

- (BOOL)isAvailableActiveFrameRate:(double)frameRate {
    return NO;
}

- (AVCaptureDevicePosition)cameraPosition {
    return AVCaptureDevicePositionFront;
}

- (void)setCameraPosition:(AVCaptureDevicePosition) position {
}

- (NSArray*)availableCameraPositions {
    NSArray* devices = [[AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:@[AVCaptureDeviceTypeBuiltInTrueDepthCamera] mediaType:AVMediaTypeVideo position:AVCaptureDevicePositionUnspecified] devices];
    NSMutableSet* result = [NSMutableSet setWithCapacity:devices.count];
    for (AVCaptureDevice* device in devices) {
        [result addObject:[NSNumber numberWithInt:device.position]];
    }
    return [result allObjects];
}

- (BOOL)toggleCameraPosition {
    return NO;
}

+ (void)dimensionsForCapturePreset:(NSString*)preset
                             width:(uint32_t*)width
                            height:(uint32_t*)height {
    if ([preset isEqualToString:AVCaptureSessionPreset352x288]) {
        *width = 352;
        *height = 288;
    } else if ([preset isEqualToString:AVCaptureSessionPreset640x480]) {
        *width = 640;
        *height = 480;
    } else if ([preset isEqualToString:AVCaptureSessionPreset1280x720]) {
        *width = 1280;
        *height = 720;
    } else if ([preset isEqualToString:AVCaptureSessionPreset1920x1080]) {
        *width = 1920;
        *height = 1080;
    } else if ([preset isEqualToString:AVCaptureSessionPresetPhoto]) {
        // see AVCaptureSessionPresetLow
        *width = 1920;
        *height = 1080;
    } else if ([preset isEqualToString:AVCaptureSessionPresetHigh]) {
        // see AVCaptureSessionPresetLow
        *width = 640;
        *height = 480;
    } else if ([preset isEqualToString:AVCaptureSessionPresetMedium]) {
        // see AVCaptureSessionPresetLow
        *width = 480;
        *height = 360;
    } else if ([preset isEqualToString:AVCaptureSessionPresetLow]) {
        // WARNING: This is a guess. might be wrong for certain devices.
        // We'll use updeateCaptureFormatWithWidth:height if actual output
        // differs from expected value
        *width = 192;
        *height = 144;
    }
}

@end
