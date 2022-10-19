//
//  RTCFakeCameraVideoCapturer.m
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-17.
//

#import "RTCFakeCameraVideoCapturer.h"

#import "base/RTCLogging.h"
#import "base/RTCVideoFrameBuffer.h"
#import "components/video_frame_buffer/RTCCVPixelBuffer.h"

#if TARGET_OS_IPHONE
#import "helpers/UIDevice+RTCDevice.h"
#endif


@interface RTC_OBJC_TYPE (RTCFakeCameraVideoCapturer) ()
{
    CVPixelBufferRef pixelBufferImages[76];
}

@property NSTimer* timer;
@property UIImage *image;
@property int numFrames;
@property int currentFrameIndex;


@end

@implementation RTC_OBJC_TYPE (RTCFakeCameraVideoCapturer) {
    
}
-(id) init {
    self = [super init];
    if(self){
        self.image = [UIImage imageNamed:@"frame1"];
        
        
        self.numFrames = sizeof(pixelBufferImages) / sizeof(CVPixelBufferRef);
        self.currentFrameIndex = 0;
        
        for(int i = 0 ; i < self.numFrames ; i++)
        {
            UIImage *img = [UIImage imageNamed:[NSString stringWithFormat:@"frame%d", i + 1]];
            CVPixelBufferRef pixelBufferRef = [self pixelBufferFromCGImage:img.CGImage];
            
            pixelBufferImages[i]  = pixelBufferRef;
        }
    }
    
    return self;
}
- (void)stopCapture {
    [self.timer invalidate];
}

- (void)startCaptureWithFps{
    
    self.timer = [NSTimer scheduledTimerWithTimeInterval:0.03 repeats:YES block:^(NSTimer * _Nonnull timer) {
        dispatch_async(dispatch_get_main_queue(),^{
            
            //CVPixelBufferRef pixelBufferRef = [self pixelBufferFromCGImage:self.image.CGImage];
            
            RTC_OBJC_TYPE(RTCCVPixelBuffer) *rtcPixelBuffer =
            [[RTC_OBJC_TYPE(RTCCVPixelBuffer) alloc] initWithPixelBuffer:self->pixelBufferImages[self->_currentFrameIndex]];
            
            RTC_OBJC_TYPE(RTCVideoFrame) *videoFrame =
            [[RTC_OBJC_TYPE(RTCVideoFrame) alloc] initWithBuffer:rtcPixelBuffer
                                                        rotation:RTCVideoRotation_0
                                                     timeStampNs:100];
            [self.delegate capturer:self didCaptureVideoFrame:videoFrame];
            
            self->_currentFrameIndex = (self->_currentFrameIndex + 1) % self->_numFrames;
        });
    }];
}

- (CVPixelBufferRef) pixelBufferFromCGImage: (CGImageRef) image
{
    NSDictionary *options = @{
        (NSString*)kCVPixelBufferCGImageCompatibilityKey : @YES,
        (NSString*)kCVPixelBufferCGBitmapContextCompatibilityKey : @YES,
        (NSString*)kCVPixelBufferMetalCompatibilityKey : @YES
    };
    
    CVPixelBufferRef pxbuffer = NULL;
    CVReturn status = CVPixelBufferCreate(kCFAllocatorDefault, CGImageGetWidth(image),
                                          CGImageGetHeight(image), kCVPixelFormatType_32ARGB, (__bridge CFDictionaryRef) options,
                                          &pxbuffer);
    if (status!=kCVReturnSuccess) {
        NSLog(@"Operation failed");
    }
    NSParameterAssert(status == kCVReturnSuccess && pxbuffer != NULL);
    
    CVPixelBufferLockBaseAddress(pxbuffer, 0);
    void *pxdata = CVPixelBufferGetBaseAddress(pxbuffer);
    
    CGColorSpaceRef rgbColorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(pxdata, CGImageGetWidth(image),
                                                 CGImageGetHeight(image), 8, 4*CGImageGetWidth(image), rgbColorSpace,
                                                 kCGImageAlphaNoneSkipFirst);
    NSParameterAssert(context);
    
    CGContextConcatCTM(context, CGAffineTransformMakeRotation(0));
    CGContextDrawImage(context, CGRectMake(0, 0, CGImageGetWidth(image),
                                           CGImageGetHeight(image)), image);
    CGColorSpaceRelease(rgbColorSpace);
    CGContextRelease(context);
    
    CVPixelBufferUnlockBaseAddress(pxbuffer, 0);
    return pxbuffer;
}

@end
