//
//  ViewController.m
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import "ViewController.h"
#import "RTCFakeCameraVideoCapturer.h"
#import "WebRTCHelper.hpp"
#import "RTCFakeCameraVideoCapturer.h"
#import <sdk/objc/native/api/video_capturer.h>
#import <sdk/objc/native/api/video_renderer.h>
#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>
#import <sdk/objc/vonage/capturer/VonageRTCCameraVideoCapturer.h>
#import <sdk/objc/native/api/video_renderer.h>
#import <sdk/objc/base/RTCMacros.h>

#import <AugmentedCompression.h>
#import "transformers.h"
#import <UnityFramework/DisplayManager.h>

int gArgc = 0;
char** gArgv = nullptr;

static const bool unity_rendering_enabled = true;

UnityFramework* UnityFrameworkLoad()
{
    NSString* bundlePath = nil;
    bundlePath = [[NSBundle mainBundle] bundlePath];
    bundlePath = [bundlePath stringByAppendingString: @"/Frameworks/UnityFramework.framework"];
    
    NSBundle* bundle = [NSBundle bundleWithPath: bundlePath];
    if ([bundle isLoaded] == false) [bundle load];
    
    UnityFramework* ufw = [bundle.principalClass getInstance];
    if (![ufw appController])
    {
        // unity is not initialized
        [ufw setExecuteHeader: &_mh_execute_header];
    }
    return ufw;
}

@interface DummyVideoView : UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>
- (void)renderFrame:(nullable RTC_OBJC_TYPE(RTCVideoFrame) *)frame;
@end

@implementation DummyVideoView

- (void)renderFrame:(nullable RTC_OBJC_TYPE(RTCVideoFrame) *)frame {
}

- (void)setSize:(CGSize)size {
}

@end


class GeneralObserver;

class AugmentedCompress : public vonage::DecompressAugmentedData {
public:
    AugmentedCompress() = default;
    virtual ~AugmentedCompress() = default;
    
    bool compress(CVPixelBufferRef depthDataMap,
                  std::unique_ptr<uint8_t[]>& outputArray,
                  uint32_t& outputSize){
        return Holographic::Compression::compress(depthDataMap, outputArray, outputSize);
    }

    bool decompress(const uint8_t* inputArray,
                    uint32_t inputSize,
                    std::unique_ptr<uint8_t[]>& outputArray,
                    uint32_t& outputSize) override{
        return Holographic::Compression::decompress(inputArray, inputSize, outputArray, outputSize);
    }
};

@interface DepthDataCompress : NSObject<RTC_OBJC_TYPE(RTCVideoDepthDataDelegate)>
-(instancetype)initCompressor:(AugmentedCompress*) compressor;
@end

@implementation DepthDataCompress
{
    AugmentedCompress* compressor_;
}

- (instancetype)initCompressor:(AugmentedCompress *)compressor {
    self = [super init];
    if(self){
        self->compressor_ = compressor;
    }
    return self;
}

- (BOOL)compressInputArray:(nonnull CVPixelBufferRef)depthDataMap outputArray:(std::unique_ptr<uint8_t[]> &)outputArray outputSize:(uint32_t &)outputSize {
    return compressor_->compress(depthDataMap, outputArray, outputSize);
}

@end

@interface ViewController () 
@property(nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* localVideoView;
@property(nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)>* remoteVideoView;
@property(nonatomic) RTC_OBJC_TYPE(RTCVideoCapturer) * capturer;
@property(nonatomic) DepthDataCompress* depthDataCompress;
@property(nonatomic) UILabel* statsLabel;
@property(nonatomic) UnityFramework* unityFramework;
@property(nonatomic) BOOL unityQuit;

+(UnityAppController*) getUnityAppController;
- (void) onStats:(NSString*)stats;
@end

@implementation ViewController {
    UIView *_view;
    rtc::scoped_refptr<WebRTCHelper> _webrtcHelper;
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> _local_sink;
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> _remote_sink;
    std::unique_ptr<GeneralObserver> _observer;
    std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::VideoFrame>> transformer_;
    std::shared_ptr<AugmentedCompress> augmented_compress_;
}

@synthesize capturer = _capturer;
@synthesize localVideoView = _localVideoView;
@synthesize unityFramework = _unityFramework;
@synthesize unityQuit = _unityQuit;

-(void)updateViews {
    _view = [[UIView alloc] initWithFrame:CGRectZero];
    
    if(unity_rendering_enabled){
        _remoteVideoView = [[DummyVideoView alloc] initWithFrame:CGRectZero];
        UIView* unity_view = [[[[self unityFramework] appController] mainDisplay] view];
        [_view addSubview:unity_view];
        [[[[self unityFramework] appController] mainDisplay] shouldShowWindow:YES];
    }else{
        _remoteVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectZero];
        _remoteVideoView.translatesAutoresizingMaskIntoConstraints = NO;
        [_view addSubview:_remoteVideoView];
        UILayoutGuide *remote_margin = _view.layoutMarginsGuide;
        [_remoteVideoView.leadingAnchor constraintEqualToAnchor:remote_margin.leadingAnchor].active = YES;
        [_remoteVideoView.topAnchor constraintEqualToAnchor:remote_margin.topAnchor].active = YES;
        [_remoteVideoView.trailingAnchor constraintEqualToAnchor:remote_margin.trailingAnchor].active = YES;
        [_remoteVideoView.bottomAnchor constraintEqualToAnchor:remote_margin.bottomAnchor].active = YES;
    }
    
    _localVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectMake(5, 5, 100, 200)];
    _localVideoView.translatesAutoresizingMaskIntoConstraints = YES;
    [_view addSubview:_localVideoView];
    
    UILayoutGuide *local_margin = _view.layoutMarginsGuide;
    [_localVideoView.leadingAnchor constraintEqualToAnchor:local_margin.leadingAnchor].active = YES;
    [_localVideoView.topAnchor constraintEqualToAnchor:local_margin.topAnchor].active = YES;
    [_localVideoView.trailingAnchor constraintEqualToAnchor:local_margin.trailingAnchor].active = YES;
    [_localVideoView.bottomAnchor constraintEqualToAnchor:local_margin.bottomAnchor].active = YES;
    
    _statsLabel = [[UILabel alloc] initWithFrame:CGRectMake(5, 200, 300, 400)];
    [_statsLabel setFont:[UIFont fontWithName: @"Arial-BoldMT" size:15.f]];
    [_statsLabel setTextColor:[UIColor whiteColor]];
    [_statsLabel setBackgroundColor:[UIColor clearColor]];
    
    self->_observer = std::make_unique<GeneralObserver>(self);
    self->_webrtcHelper = new rtc::RefCountedObject<WebRTCHelper>(self->_observer.get());
    self.view = _view;
}

-(void)viewDidLoad {
    [super viewDidLoad];
    
    self->_unityQuit = NO;
    [self initUnity];
    [self updateViews];
}

- (void)viewDidAppear:(BOOL)animated {
    [[[[self unityFramework] appController] rootViewController] viewDidAppear:animated];
//    [super viewDidAppear:animated];
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)) , dispatch_get_main_queue(), ^() {
#if TARGET_OS_SIMULATOR
        self.capturer = [[RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer) alloc] init];
#else
        self.capturer = [[RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer) alloc] init];
        self->augmented_compress_ = std::make_shared<AugmentedCompress>();
        self.depthDataCompress = [[DepthDataCompress alloc] initCompressor:self->augmented_compress_.get()];
        RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer)* local_capturer = static_cast<RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer*)>(self->_capturer);
        [local_capturer updateDepthDelegate:self->_depthDataCompress];
#endif
        self->_local_sink = webrtc::ObjCToNativeVideoRenderer(self->_localVideoView);
        self->_remote_sink = webrtc::ObjCToNativeVideoRenderer(self->_remoteVideoView);
        
        self->transformer_ = std::make_shared<vonage::VonageUnityVideoTransformer>(self->_observer.get(), self->augmented_compress_, unity_rendering_enabled, self->_unityFramework);
        
        if([self->_capturer isKindOfClass:[RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer) class]]){
            RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer)* local_capturer = (RTC_OBJC_TYPE(VonageRTCCameraVideoCapturer)*)self->_capturer;
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
            int targetWidth = 640;
            int targetHeight = 480;
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
            AVCaptureDeviceInput* device_input = [AVCaptureDeviceInput deviceInputWithDevice:selectedDevice error:&error];
            [local_capturer startWithDevice:selectedDevice format:selectedFormat sessionPreset:AVCaptureSessionPreset640x480 videoDeviceInput:device_input videoMirrored:YES pixelFormat:kCVPixelFormatType_32BGRA depthFormat:depthFormat CompletionHandler:^(NSError * _Nullable error) {
                if(!error){
                    rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_track_source = webrtc::ObjCToNativeVideoCapturer(self->_capturer, self->_webrtcHelper->getSignalingThread(), self->_webrtcHelper->getWorkerThread());
                    self->_webrtcHelper->init(video_track_source.get(), std::move(self->_local_sink), std::move(self->_remote_sink), self->transformer_, true);
                    self->_webrtcHelper->requestStats();
                }
            }];
        } else {
            RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer)* local_capturer = (RTC_OBJC_TYPE(RTCFakeCameraVideoCapturer)*)self->_capturer;
            [local_capturer stopCapture];
            rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_track_source = webrtc::ObjCToNativeVideoCapturer(self->_capturer, self->_webrtcHelper->getSignalingThread(), self->_webrtcHelper->getWorkerThread());
            self->_webrtcHelper->init(video_track_source.get(), std::move(self->_local_sink), std::move(self->_remote_sink), self->transformer_, false);
            self->_webrtcHelper->requestStats();
        }
    });
    [[[[self unityFramework] appController] rootViewController] viewDidAppear:animated];
}

-(void) viewDidDisappear:(BOOL)animated{
    [super viewDidDisappear:animated];
    if(![self unityIsInitialized]) {
        NSLog(@"Unity is not initialized. Initialize Unity first");
    } else {
        [UnityFrameworkLoad() unloadApplication];
    }
}

- (void)onStats:(NSString*)stats {
    dispatch_sync(dispatch_get_main_queue(), ^{
        [NSTimer scheduledTimerWithTimeInterval:3 repeats:NO block:^(NSTimer * _Nonnull timer) {
            self->_webrtcHelper->requestStats();
        }];
        if([stats length] <= 0){
            return;
        }
        [_statsLabel removeFromSuperview];
        [_statsLabel setText:stats];
        [_statsLabel setNumberOfLines:0];
        [self.view addSubview:_statsLabel];
    });
}

- (bool)unityIsInitialized {
    return [self unityFramework] && [[self unityFramework] appController];
}

- (void)initUnity
{
    if([self unityIsInitialized]) {
        NSLog(@"Unity already initialized. Unload Unity first");
        return;
    }
    
    if(self->_unityQuit) {
        NSLog(@"Unity cannot be initialized after quit. Use unload instead");
        return;
    }
    
    self->_unityFramework = UnityFrameworkLoad();
    
    // Set UnityFramework target for Unity-iPhone/Data folder to make Data part of a UnityFramework.framework and uncomment call to setDataBundleId
    // ODR is not supported in this case, ( if you need embedded and ODR you need to copy data )
    [[self unityFramework] setDataBundleId: "com.unity3d.framework"];
    [[self unityFramework] registerFrameworkListener: self];
    
    NSDictionary* appLaunchOpts = [[NSDictionary alloc] init];
    [[self unityFramework] runEmbeddedWithArgc: gArgc argv: gArgv appLaunchOpts: appLaunchOpts];
}

- (void)unityDidUnload:(NSNotification*)notification
{
    NSLog(@"unityDidUnload called");
    [[self unityFramework] unregisterFrameworkListener: self];
    self->_unityFramework = nil;
}

- (void)unityDidQuit:(NSNotification*)notification
{
    NSLog(@"unityDidQuit called");
    [[self unityFramework] unregisterFrameworkListener: self];
    self->_unityFramework = nil;
    self->_unityQuit = YES;
}

+ (UnityAppController *)getUnityAppController {
    return nil;
}

@end

class GeneralObserver : public webrtc::BaseFrameTransformerObserver, public WebRTCHelperObserver{
public:
    GeneralObserver(ViewController* view_controller) : webrtc::BaseFrameTransformerObserver(rtc::Thread::Current()), _view_controller(view_controller){};
    virtual ~GeneralObserver() = default;
    
    // BaseFrameTransformerObsever implementation.
    void OnWarning(webrtc::MediaProcessorWarningCode code, const std::string& message) override{
        RTC_LOG_T_F(LS_WARNING) << "TransformerObserver code: " << code << " message: " << message;
    }
    void OnError(webrtc::MediaProcessorErrorCode code, const std::string& message) override{
        RTC_LOG_T_F(LS_ERROR) << "TransformerObserver code: " << code << " message: " << message;
    }
    void OnWarning(uint8_t code, const std::string& message) override {
        RTC_LOG_T_F(LS_WARNING) << "TransformerObserver code: " << code << " message: " << message;
    }
    void OnError(uint8_t code, const std::string& message) override {
        RTC_LOG_T_F(LS_ERROR) << "TransformerObserver code: " << code << " message: " << message;

    }
    void OnStats(const std::string& stats) override{
        NSString* res;
        if(!stats.empty()){
            @autoreleasepool {
                NSString* jsonString = [NSString stringWithFormat:@"%s", stats.c_str()];
                NSData *jsonData = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
                NSError *error = nil;
                id jsonObject = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&error];
                
                if (!error) {
                    if ([jsonObject isKindOfClass:[NSArray class]]) {
                        NSArray *jsonArray = (NSArray *)jsonObject;
                        for(id elemet in jsonArray){
                            if([elemet isKindOfClass:[NSDictionary class]]){
                                NSDictionary* jsonElemet = (NSDictionary*) elemet;
                                NSString* type = jsonElemet[@"type"];
                                NSString* kind = jsonElemet[@"kind"];
                                if([type isEqual: @"inbound-rtp"] && [kind isEqual:@"video"]){
                                    NSNumber* fps = jsonElemet[@"framesPerSecond"];
                                    NSNumber* bw = jsonElemet[@"bytesReceived"];
                                    remote_stats_ = [NSString stringWithFormat:@"fps: %@ bytes: %.3f MB",fps, bw.doubleValue / 1048576];
                                }
                                if([type isEqual: @"outbound-rtp"] && [kind isEqual:@"video"]){
                                    NSNumber* fps = jsonElemet[@"framesPerSecond"];
                                    NSNumber* bw = jsonElemet[@"bytesSent"];
                                    local_stats_ = [NSString stringWithFormat:@"fps: %@ bytes: %.3f MB",fps, bw.doubleValue / 1048576];
                                }
                            }
                        }
                    }
                }
            }
        }
        res = [NSString stringWithFormat:@"local: %@\rremote: %@", [local_stats_ length] > 0 ? local_stats_ : @"NA" , [remote_stats_ length] > 0 ? remote_stats_ : @"NA"];
        [_view_controller onStats:res];
    }
private:
    ViewController* _view_controller;
    NSString* local_stats_;
    NSString* remote_stats_;
};
