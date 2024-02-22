#import "ViewController.h"

#import <OpenTok/OpenTok.h>

#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>

#import <UnityFramework/NativeCallProxy.h>

#import "Capturer.h"
#import "Renderer.h"

#import "Logger.h"

#define MAX_PARTICIPANTS_PER_ROOM 2

typedef struct {
    NSString* apiKey;
    NSString* sessionId;
    NSString* token;
} HoloCredentials;

int gArgc = 0;
char** gArgv = nullptr;

// *** Fill the following variables using your own Project info  ***
// ***          https://dashboard.tokbox.com/projects            ***
// Replace with your OpenTok API key
static NSString* const kApiKey = @"";
// Replace with your generated session ID
static NSString* const kSessionId = @"";
// Replace with your generated token
static NSString* const kToken = @"";

static NSString* const kHoloRoomServiceServerIP = @"3.19.223.109";
static NSString* const kHoloRoomServiceURI = @"https://3.19.223.109:8080/room/%@/info";

static const char* kOpenTokQueueLabel = "com.vonage.camera.video.session.queue";
static const uint32_t kHangupButtonColor = 0xDC2D37;

extern bool _unityAppReady;

@protocol UnityCallbackDelegate <NSObject>
- (void)unityDidUnload:(BOOL)sender;
- (void)unityDidQuit:(BOOL)sender;
@end

@interface UnityEventListner : NSObject<UnityFrameworkListener>
-(instancetype)initWithDelegate:(id<UnityCallbackDelegate>)delegate;
@property(nonatomic)BOOL sender;
@end

@interface UnityEventListner()
@property(nonatomic, assign) id<UnityCallbackDelegate> _Nullable delegate;
@end

@implementation UnityEventListner

- (instancetype)initWithDelegate:(id<UnityCallbackDelegate>)delegate{
    self = [super init];
    if(self){
        self->_sender = NO;
        self->_delegate = delegate;
    }
    return self;
}

- (void)unityDidUnload:(NSNotification*)notification {
    [self->_delegate unityDidUnload:self->_sender];
}

- (void)unityDidQuit:(NSNotification*)notification {
    [self->_delegate unityDidQuit:self->_sender];
}

@end

@interface ViewController ()<OTSessionDelegate, OTSubscriberDelegate, OTPublisherDelegate, NSURLSessionDelegate, OTPublisherKitRtcStatsReportDelegate, OTSubscriberKitRtcStatsReportDelegate, UnityCallbackDelegate>
@property (nonatomic) OTSession *session;
@property (nonatomic) OTPublisher *publisher;
@property (nonatomic) UnityFramework* unityFramework;
@property (nonatomic) BOOL unityQuit;
@property (nonatomic) Renderer *renderer;
@property (nonatomic) OTSubscriber *subscriber;
@property (nonatomic) UILabel* publisherStatsLabel;
@property (nonatomic) UILabel* subscriberStatsLabel;
@property (nonatomic) BOOL sender;
@property (nonatomic) NSString* roomName;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *localVideoView;
@property (nonatomic) Capturer* capturer;
@property (nonatomic) BOOL wasUnityPresented;
@property (nonatomic) dispatch_queue_t opentokQueue;
@property (strong) UIButton *hangupButton;
@property (nonatomic) UnityEventListner* unityEventListner;
@property (nonatomic) BOOL enableLogs;
@end

@implementation ViewController {
    uint8_t _participantsNumber;
}

@synthesize session = _session;
@synthesize publisher = _publisher;
@synthesize subscriber = _subscriber;
@synthesize unityFramework = _unityFramework;
@synthesize roomName = _roomName;
@synthesize sender = _sender;
@synthesize wasUnityPresented = _wasUnityPresented;
@synthesize localVideoView = _localVideoView;
@synthesize capturer = _capturer;
@synthesize renderer = _renderer;
@synthesize hangupButton = _hangupButton;
@synthesize enableLogs = _enableLogs;

+(NSBundle*) getUnityBundle {
    NSString* bundlePath = nil;
    bundlePath = [[NSBundle mainBundle] bundlePath];
    bundlePath = [bundlePath stringByAppendingString: @"/Frameworks/UnityFramework.framework"];

    NSBundle* bundle = [NSBundle bundleWithPath: bundlePath];
    return bundle;
}

+(UnityFramework*) unityFrameworkLoad {
    NSBundle* bundle = [ViewController getUnityBundle];
    if(bundle == nil){
        return nil;
    }
    if ([bundle isLoaded] == false){
        [bundle load];
    }

    UnityFramework* ufw = [bundle.principalClass getInstance];
    if (![ufw appController])
    {
        // unity is not initialized
        [ufw setExecuteHeader: &_mh_execute_header];
    }
    return ufw;
}

+(void) unityFrameworkUnload {
    NSBundle* bundle = [ViewController getUnityBundle];
    if(bundle == nil){
        return;
    }
    
    if ([bundle isLoaded]){
        [bundle unload];
    }
}

-(void)initApp {
    self->_sender = NO;
    self->_unityQuit = NO;
    self->_wasUnityPresented = NO;
    self->_enableLogs = NO;
    self->_unityEventListner = [[UnityEventListner alloc] initWithDelegate:self];
    [self initUnity];
}

-(void)hangup{
    [self doOpentokUninit];
}

-(void)afterSessionCleanup{
    dispatch_async(dispatch_get_main_queue(), ^{
        [self->_subscriberStatsLabel removeFromSuperview];
        [self->_publisherStatsLabel removeFromSuperview];
        [self->_localVideoView removeFromSuperview];
        [self->_hangupButton removeFromSuperview];
        if(![self uninitUnity]){
            [self initApp];
            [self showUnityWindow];
        }
    });
}

-(void) showUnityWindow{
    NSLog(@"showUnityWindow");
    if([NSThread isMainThread]){
        if(_unityAppReady){
            [self presentViewController:[[[self unityFramework] appController] rootViewController] animated:YES completion:^{
                self->_wasUnityPresented = YES;
            }];
        }else{
            [NSTimer scheduledTimerWithTimeInterval:1.0 repeats:NO block:^(NSTimer * _Nonnull timer) {
                [self showUnityWindow];
            }];
        }
    }else{
        dispatch_sync(dispatch_get_main_queue(), ^{
            if(_unityAppReady){
                [self presentViewController:[[[self unityFramework] appController] rootViewController] animated:YES completion:^{
                    self->_wasUnityPresented = YES;
                }];
            }else{
                [NSTimer scheduledTimerWithTimeInterval:1.0 repeats:NO block:^(NSTimer * _Nonnull timer) {
                    [self showUnityWindow];
                }];
            }
        });
    }
}

#pragma mark - View lifecycle
- (void)viewDidLoad {
    [super viewDidLoad];
    dispatch_queue_attr_t qosAttribute = dispatch_queue_attr_make_with_qos_class(DISPATCH_QUEUE_SERIAL, QOS_CLASS_USER_INTERACTIVE, /*relative_priority=*/0);
    self.opentokQueue = dispatch_queue_create(kOpenTokQueueLabel, qosAttribute);
    [self.view setBackgroundColor:[UIColor blackColor]];
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear: animated];
    if(!self->_wasUnityPresented){
        [self initApp];
    }
    if(self->_sender){
        self->_publisherStatsLabel = [[UILabel alloc] initWithFrame:CGRectMake(5, 200, 300, 400)];
        [self->_publisherStatsLabel setFont:[UIFont fontWithName: @"Arial-BoldMT" size:15.f]];
        [self->_publisherStatsLabel setTextColor:[UIColor whiteColor]];
        [self->_publisherStatsLabel setBackgroundColor:[UIColor clearColor]];
    }
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    if(_wasUnityPresented == NO){
        [self showUnityWindow];
    }
}

-(void) viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
}

- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear: animated];
}

-(void)dealloc {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    [self doOpentokUninit];
    [self uninitUnity];
}
#pragma mark - Unity methods

- (bool)unityIsInitialized {
    return [self unityFramework] && [[self unityFramework] appController];
}

- (void)initUnity {
    if ([self unityIsInitialized]) {
        NSLog(@"Unity already initialized. Unload Unity first");
        return;
    }
    
    if (self->_unityQuit) {
        NSLog(@"Unity cannot be initialized after quit. Use unload instead");
        return;
    }
    
    self->_unityFramework = [ViewController unityFrameworkLoad];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(roomNameAndRoleNotification:)
                                                 name:kRoomNameAndRoleNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(hangupNotification:)
                                                 name:kHangupNotification
                                               object:nil];
    
    [[self unityFramework] setDataBundleId: "com.unity3d.framework"];
    [[self unityFramework] registerFrameworkListener: self->_unityEventListner];
    
    NSDictionary* appLaunchOpts = [[NSDictionary alloc] init];
    [[self unityFramework] runEmbeddedWithArgc: gArgc argv: gArgv appLaunchOpts: appLaunchOpts];
    [FrameworkLibAPI setUnityRenderer:YES];
}

- (void)unityDidUnload:(BOOL)sender {
    NSLog(@"unityDidUnload called");
    [[self unityFramework] unregisterFrameworkListener: self->_unityEventListner];
    self->_unityFramework = nil;
    if(!sender){
        self->_wasUnityPresented = NO;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] removeObserver:self];
        [self dismissViewControllerAnimated:YES completion:nil];
    });
}

- (void)unityDidQuit:(BOOL)sender {
    NSLog(@"unityDidQuit called");
    [[self unityFramework] unregisterFrameworkListener: self->_unityEventListner];
    self->_unityFramework = nil;
    self->_unityQuit = YES;
}

-(BOOL) uninitUnity{
    if ([self unityIsInitialized]) {
        [self->_unityFramework unloadApplication];
        [ViewController unityFrameworkUnload];
        return YES;
    }
    return NO;
}

#pragma mark - OpenTok local methods

- (void)doOpentokInit {
    if (![kApiKey isEqualToString:@""] && ![kSessionId isEqualToString:@""]) {
        HoloCredentials credentials;
        credentials.apiKey = kApiKey;
        credentials.sessionId = kSessionId;
        credentials.token = kToken;
        [self doConnectHoloCredentials:credentials];
        return;
    }
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:kHoloRoomServiceURI, _roomName]];
    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration defaultSessionConfiguration];
    NSURLSession *session = [NSURLSession sessionWithConfiguration:configuration delegate:self delegateQueue:[NSOperationQueue mainQueue]];
    NSURLRequest *urlRequest = [NSURLRequest requestWithURL:url];
    NSMutableURLRequest *mutableRequest = [urlRequest mutableCopy];
    [mutableRequest setHTTPMethod: @"GET"];
    [mutableRequest addValue:@"application/json, text/plain, */*" forHTTPHeaderField:@"Accept"];
    
    [[session dataTaskWithRequest:mutableRequest
                completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if (!error) {
            NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
            NSError *parseError = nil;
            if (httpResponse.statusCode == 200) {
                NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&parseError];
                if ([dict objectForKey:@"apiKey"] &&
                    [dict objectForKey:@"sessionId"] &&
                    [dict objectForKey:@"token"]) {
                    HoloCredentials credentials;
                    credentials.apiKey = [dict objectForKey:@"apiKey"];
                    credentials.sessionId = [dict objectForKey:@"sessionId"];
                    credentials.token = [dict objectForKey:@"token"];
                    [self doConnectHoloCredentials:credentials];
                } else {
                    [self showAlert:@"Failed to receive Video API credentials"];
                }
            } else {
                NSString *codeErr = [NSString stringWithFormat:@"Network error code:%ld", (long)httpResponse.statusCode];
                [self showAlert:codeErr];
            }
        } else {
            [self showAlert:error.description];
        }
    }] resume];
}

- (void)doOpentokUninit {
    dispatch_sync(self->_opentokQueue, ^{
        OTError* error;
        if(self->_session){
            [self->_session disconnect:&error];
            if(error){
                NSLog(@"erro disconnect from session");
                [self afterSessionCleanup];
            }
        }else{
            [self afterSessionCleanup];
        }
        [self->_capturer stopCapture];
        self->_capturer = nil;
        self->_renderer = nil;
    });
}

- (void)doConnectHoloCredentials:(const HoloCredentials&)credentials
{
    dispatch_sync(self->_opentokQueue, ^{
        self->_participantsNumber = 0;
        self->_session = [[OTSession alloc] initWithApiKey:credentials.apiKey
                                                 sessionId:credentials.sessionId
                                                  delegate:self];
        OTError *error = nil;
        [self->_session connectWithToken:credentials.token error:&error];
        if (error) {
            [self showAlert:[error localizedDescription]];
        }
    });
}

-(void)doPublish
{
    dispatch_async(self->_opentokQueue, ^{
        OTPublisherSettings *settings = [[OTPublisherSettings alloc] init];
        settings.name = [UIDevice currentDevice].name;
        settings.videoCapture = self->_capturer;
        self->_publisher = [[OTPublisher alloc] initWithDelegate:self settings:settings];
        self->_publisher.rtcStatsReportDelegate = self;
        OTError *error = nil;
        [self->_session publish:self->_publisher error:&error];
        if (error)
        {
            [self showAlert:[error localizedDescription]];
        }
    });
}

- (void)cleanupPublisher {
    dispatch_async(self->_opentokQueue, ^{
        [self->_publisher.view removeFromSuperview];
        self->_publisher = nil;
    });
}

- (void)doSubscribe:(OTStream*)stream
{
    dispatch_async(self->_opentokQueue, ^{
        self->_renderer = [[Renderer alloc] initWithUnity:self->_unityFramework];
        self->_subscriber = [[OTSubscriber alloc] initWithStream:stream delegate:self];
        self->_subscriber.rtcStatsReportDelegate = self;
        [self->_subscriber setVideoRender:self->_renderer];
        OTError *error = nil;
        [self->_session subscribe:self->_subscriber error:&error];
        if (error)
        {
            [self showAlert:[error localizedDescription]];
        }
    });
}

- (void)cleanupSubscriber
{
    dispatch_async(self->_opentokQueue, ^{
        [self->_renderer clearRenderBuffer];
        self->_subscriber = nil;
    });
}

# pragma mark - OTSession delegate callbacks

- (void)sessionDidConnect:(OTSession*)session
{
    dispatch_async(self->_opentokQueue, ^{
        NSLog(@"sessionDidConnect (%@)", session.sessionId);
        ++self->_participantsNumber;
        dispatch_async(dispatch_get_main_queue(), ^{
            [self->_hangupButton setEnabled:YES];
            [NSTimer scheduledTimerWithTimeInterval:0.5 repeats:NO block:^(NSTimer * _Nonnull timer) {
                if (self->_participantsNumber > MAX_PARTICIPANTS_PER_ROOM) {
                    [session disconnect:nil];
                    NSLog(@"sessionDidConnect (%d participants)", self->_participantsNumber);
                    [self showAlert:@"Room is full. Disconnecting."];
                    return;
                }
                
                if (self->_sender) {
                    dispatch_async(self->_opentokQueue, ^{
                        [self doPublish];
                    });
                }
            }];
        });
    });
}

- (void)sessionDidDisconnect:(OTSession*)session
{
    [self afterSessionCleanup];
}


- (void)session:(OTSession*)mySession streamCreated:(OTStream *)stream
{
    dispatch_async(self->_opentokQueue, ^{
        NSLog(@"session streamCreated (%@)", stream.streamId);
        if ((nil == self->_subscriber) && (self->_sender == NO)) {
            [self doSubscribe:stream];
        }
    });
}

- (void)session:(OTSession*)session streamDestroyed:(OTStream *)stream
{
    dispatch_async(self->_opentokQueue, ^{
        NSLog(@"session streamDestroyed (%@)", stream.streamId);
        if ([self->_subscriber.stream.streamId isEqualToString:stream.streamId])
        {
            [self cleanupSubscriber];
        }
    });
}

- (void) session:(OTSession *)session connectionCreated:(OTConnection *)connection
{
    dispatch_async(self->_opentokQueue, ^{
        NSLog(@"session connectionCreated (%@)", connection.connectionId);
        // Sent when another client connects to the session.
        // This message is not sent when your own client connects to the session.
        ++self->_participantsNumber;
    });
}

- (void) session:(OTSession *)session connectionDestroyed:(OTConnection *)connection
{
    dispatch_async(self->_opentokQueue, ^{
        NSLog(@"session connectionDestroyed (%@)", connection.connectionId);
        // Sent when another client disconnects from the session.
        // This message is not sent when your own client disconnects from the session.
        --self->_participantsNumber;
        if ([self->_subscriber.stream.connection.connectionId
             isEqualToString:connection.connectionId])
        {
            [self cleanupSubscriber];
        }
    });
}

- (void) session:(OTSession*)session didFailWithError:(OTError*)error
{
    NSLog(@"didFailWithError: (%@)", error);
}

# pragma mark - OTSubscriber delegate callbacks
- (void)subscriberDidConnectToStream:(OTSubscriberKit*)subscriber
{
    NSLog(@"subscriberDidConnectToStream (%@)", subscriber.stream.connection.connectionId);
    if (_enableLogs) {
        dispatch_async(dispatch_get_main_queue(), ^{
            assert(self->_subscriber == subscriber);
            [NSTimer scheduledTimerWithTimeInterval:3 repeats:YES block:^(NSTimer * _Nonnull timer) {
                dispatch_async(self->_opentokQueue, ^{
                    [self->_subscriber getRtcStatsReport];
                });
            }];
        });
    }
}

- (void)subscriber:(OTSubscriberKit*)subscriber didFailWithError:(OTError*)error
{
    NSLog(@"subscriber %@ didFailWithError %@", subscriber.stream.streamId, error);
}

# pragma mark - OTPublisher delegate callbacks
- (void)publisher:(OTPublisherKit *)publisher streamCreated:(OTStream *)stream
{
    if (_enableLogs) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [NSTimer scheduledTimerWithTimeInterval:3 repeats:YES block:^(NSTimer * _Nonnull timer) {
                dispatch_async(self->_opentokQueue, ^{
                    [self->_publisher getRtcStatsReport];
                });
            }];
        });
    }
}

- (void)publisher:(OTPublisherKit*)publisher streamDestroyed:(OTStream *)stream
{
    dispatch_async(self->_opentokQueue, ^{
        if ([self->_subscriber.stream.streamId isEqualToString:stream.streamId])
        {
            [self cleanupSubscriber];
        }
        [self cleanupPublisher];
    });
    
}

- (void)publisher:(OTPublisherKit*)publisher didFailWithError:(OTError*) error
{
    dispatch_async(self->_opentokQueue, ^{
        NSLog(@"publisher didFailWithError %@", error);
        [self cleanupPublisher];
    });
}

- (void)showAlert:(NSString *)string
{
    dispatch_async(dispatch_get_main_queue(), ^{
        UIAlertController *alertVC = [UIAlertController alertControllerWithTitle:@"Error"
                                                                         message:[NSString stringWithFormat:@"%@\r\nThe app will be closed", string]
                                                                  preferredStyle:UIAlertControllerStyleAlert];
        
        UIAlertAction* okAction = [UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:^(UIAlertAction * _Nonnull action) {
            exit(0);
        }];
        [alertVC addAction:okAction];
        [self presentViewController:alertVC animated:YES completion:nil];
    });
}

- (void) URLSession:(NSURLSession *)session
didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
  completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential * _Nullable))completionHandler {
    
    if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
        if ([challenge.protectionSpace.host isEqualToString:kHoloRoomServiceServerIP]) {
            NSURLCredential *credential = [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust];
            completionHandler(NSURLSessionAuthChallengeUseCredential, credential);
        } else {
            completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, nil);
        }
    }
}

- (void)publisher:(nonnull OTPublisherKit *)publisher rtcStatsReport:(nonnull NSArray<OTPublisherRtcStats*> *)stats {
    if ([stats count] == 1) {
        OTPublisherRtcStats* publisherStats = stats[0];
        NSString* stats;
        NSString* outboundStats;
        @autoreleasepool {
            NSData *jsonData = [publisherStats.jsonArrayOfReports dataUsingEncoding:NSUTF8StringEncoding];
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
                            if([type isEqual: @"outbound-rtp"] && [kind isEqual:@"video"]){
                                NSNumber* fps = jsonElemet[@"framesPerSecond"];
                                NSNumber* bw = jsonElemet[@"bytesSent"];
                                outboundStats = [NSString stringWithFormat:@"fps: %@ bytes: %.3f MB",fps, bw.doubleValue / 1048576];
                            }
                        }
                    }
                }
            }
        }
        stats = [NSString stringWithFormat:@"Publisher: %@", [outboundStats length] > 0 ? outboundStats : @"NA"];
        dispatch_async(dispatch_get_main_queue(), ^{
            [self->_publisherStatsLabel removeFromSuperview];
            [self->_publisherStatsLabel setText:stats];
            [self->_publisherStatsLabel setNumberOfLines:0];
            [self->_localVideoView addSubview:self->_publisherStatsLabel];
        });
    }
}

- (void)subscriber:(nonnull OTSubscriberKit *)subscriber rtcStatsReport:(nonnull NSString *)jsonArrayOfReports {
    NSString* stats;
    NSString* inboundStats;
    @autoreleasepool {
        NSData *jsonData = [jsonArrayOfReports dataUsingEncoding:NSUTF8StringEncoding];
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
                            inboundStats = [NSString stringWithFormat:@"fps: %@ bytes: %.3f MB",fps, bw.doubleValue / 1048576];
                        }
                    }
                }
            }
        }
    }
    stats = [NSString stringWithFormat:@"Subscriber: %@\n", [inboundStats length] > 0 ? inboundStats : @"NA"];
    dispatch_async(dispatch_get_main_queue(), ^{
        [self->_subscriberStatsLabel removeFromSuperview];
        [self->_subscriberStatsLabel setText:stats];
        [self->_subscriberStatsLabel setNumberOfLines:0];
        [[[[self unityFramework] appController] rootView]addSubview:self->_subscriberStatsLabel];
    });
}

-(void) addHangupButton {
    dispatch_async(dispatch_get_main_queue(), ^{
        self->_hangupButton = [UIButton buttonWithType:UIButtonTypeCustom];
        NSString* imagePath = [NSString stringWithFormat:@"%@/phone-hangup-white.png",[[NSBundle mainBundle] resourcePath]];
        UIImage* hangupImage = [[UIImage alloc] initWithContentsOfFile:imagePath];
        self->_hangupButton.frame = CGRectMake(self.view.center.x - hangupImage.size.width / 2, self.view.center.y * 1.7, hangupImage.size.width + 20, hangupImage.size.height + 20);
        [[self->_hangupButton layer] setCornerRadius:(CGFloat)(hangupImage.size.width + 20)/2];
        [self->_hangupButton setImage:hangupImage forState:UIControlStateNormal];
        CGFloat red =   CGFloat((kHangupButtonColor & 0xFF0000) >> 16) / 0xFF;
        CGFloat green = CGFloat((kHangupButtonColor & 0x00FF00) >> 8) / 0xFF;
        CGFloat blue =  CGFloat(kHangupButtonColor & 0x0000FF) / 0xFF;
        CGFloat alpha = CGFloat(1.0);
        [self->_hangupButton setBackgroundColor:[UIColor colorWithRed:red green:green blue:blue alpha:alpha]];
        [self->_hangupButton addTarget:self action:@selector(hangupButtonTapped:) forControlEvents:UIControlEventTouchUpInside];
        [self->_hangupButton setEnabled:NO];
        [self.view addSubview:self->_hangupButton];
    });
}

- (void)hangupButtonTapped:(UIButton *)sender {
    [self hangup];
}

- (void)roomNameAndRoleNotification:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo;
    NSLog(@"Notification received with userInfo: %@", userInfo);
    _sender = false;
    if([userInfo objectForKey:@"isSender"]){
        _sender = [[userInfo valueForKey:@"isSender"] boolValue];
    }
    
    if([userInfo objectForKey:@"roomName"]){
        _roomName = [userInfo valueForKey:@"roomName"] ;
    }
    
    if([userInfo objectForKey:@"enableLogs"]){
        _enableLogs = [[userInfo valueForKey:@"enableLogs"] boolValue];
    }
    
    if(_sender){
        dispatch_async(dispatch_get_main_queue(), ^{
            [self->_unityEventListner setSender:YES];
            self->_localVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectMake(0, self.view.center.y - 320, 480, 640)];
            self->_capturer = [[Capturer alloc] initWithCapturePreset:AVCaptureSessionPreset640x480 andDelegate:self->_localVideoView];
            [self->_capturer startCaptureCompletionHandler:^(NSError * error) {
                dispatch_sync(dispatch_get_main_queue(), ^{
                    if(!error){
                        [self.view addSubview:self->_localVideoView];
                        [self addHangupButton];
                        [self uninitUnity];
                    }
                });
            }];
        });
    }else{
        [self->_unityEventListner setSender:NO];
        self->_subscriberStatsLabel = [[UILabel alloc] initWithFrame:CGRectMake(5, 200, 300, 400)];
        [self->_subscriberStatsLabel setFont:[UIFont fontWithName: @"Arial-BoldMT" size:15.f]];
        [self->_subscriberStatsLabel setTextColor:[UIColor whiteColor]];
        [self->_subscriberStatsLabel setBackgroundColor:[UIColor clearColor]];
    }
    [self doOpentokInit];
}

-(void)hangupNotification: (NSNotification *)notification {
    [self hangup];
}

@end
