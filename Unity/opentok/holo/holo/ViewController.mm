#import "ViewController.h"

#import <OpenTok/OpenTok.h>

#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>

#include <UnityFramework/NativeCallProxy.h>

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

static double widgetHeight = 240;
static double widgetWidth = 320;

static BOOL const kUnityRenderingEnabled = YES;

UnityFramework* UnityFrameworkLoad() {
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

@interface ViewController ()<OTSessionDelegate, OTSubscriberDelegate, OTPublisherDelegate, NSURLSessionDelegate, OTPublisherKitRtcStatsReportDelegate, OTSubscriberKitRtcStatsReportDelegate>
@property (nonatomic) OTSession *session;
@property (nonatomic) OTPublisher *publisher;
@property(nonatomic) UnityFramework* unityFramework;
@property(nonatomic) BOOL unityQuit;
@property (nonatomic) Renderer *renderer;
@property (nonatomic) OTSubscriber *subscriber;
@property (nonatomic) UILabel* publisherStatsLabel;
@property (nonatomic) UILabel* subscriberStatsLabel;
@property (nonatomic) BOOL sender;
@property (nonatomic) NSString* roomName;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *localVideoView;
@property (nonatomic) Capturer* capturer;
@property (nonatomic) BOOL wasUnityPresented;
@end

@implementation ViewController {
    
    HoloCredentials credentials;
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

#pragma mark - View lifecycle
- (void)viewDidLoad {
    [super viewDidLoad];
    self->_sender = NO;
    self->_unityQuit = NO;
    self->_wasUnityPresented = NO;
    [self initUnity:YES];
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear: animated];
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
        [self presentViewController:[[[self unityFramework] appController] rootViewController] animated:YES completion:^{
            self->_wasUnityPresented = YES;
        }];
    }
}

-(void) viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
}

- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear: animated];
;
}

-(void)dealloc {
    if (![self unityIsInitialized]) {
        NSLog(@"Unity is not initialized. Initialize Unity first.");
    } else {
        [UnityFrameworkLoad() unloadApplication];
    }
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (bool)unityIsInitialized {
    return [self unityFramework] && [[self unityFramework] appController];
}

- (void)initUnity:(BOOL)isSender {
    if ([self unityIsInitialized]) {
        NSLog(@"Unity already initialized. Unload Unity first");
        return;
    }

    if (self->_unityQuit) {
        NSLog(@"Unity cannot be initialized after quit. Use unload instead");
        return;
    }

    self->_unityFramework = UnityFrameworkLoad();

    if (kUnityRenderingEnabled) {
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(roomNameAndRoleNotification:)
                                                     name:kRoomNameAndRoleNotification
                                                   object:nil];
    }
    [[self unityFramework] setDataBundleId: "com.unity3d.framework"];
    [[self unityFramework] registerFrameworkListener: self];

    NSDictionary* appLaunchOpts = [[NSDictionary alloc] init];
    [[self unityFramework] runEmbeddedWithArgc: gArgc argv: gArgv appLaunchOpts: appLaunchOpts];
    [FrameworkLibAPI setUnityRenderer:kUnityRenderingEnabled];
    [FrameworkLibAPI setRole:isSender];
}

- (void)unityDidUnload:(NSNotification*)notification {
    NSLog(@"unityDidUnload called");
    [[self unityFramework] unregisterFrameworkListener: self];
    self->_unityFramework = nil;
}

- (void)unityDidQuit:(NSNotification*)notification {
    NSLog(@"unityDidQuit called");
    [[self unityFramework] unregisterFrameworkListener: self];
    self->_unityFramework = nil;
    self->_unityQuit = YES;
}

- (void)doInit {
    if (![kApiKey isEqualToString:@""] && ![kSessionId isEqualToString:@""]) {
        _session = [[OTSession alloc] initWithApiKey:kApiKey
                                           sessionId:kSessionId
                                            delegate:self];
        [self doConnect];
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
                    self->credentials.apiKey = [dict objectForKey:@"apiKey"];
                    self->credentials.sessionId = [dict objectForKey:@"sessionId"];
                    self->credentials.token = [dict objectForKey:@"token"];
                    self->_session = [[OTSession alloc] initWithApiKey:self->credentials.apiKey
                                                             sessionId:self->credentials.sessionId
                                                              delegate:self];
                    [self doConnect];
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

- (BOOL)prefersStatusBarHidden
{
    return YES;
}

- (BOOL)shouldAutorotate {
    return UIUserInterfaceIdiomPhone != [[UIDevice currentDevice] userInterfaceIdiom];
}

#pragma mark - OpenTok methods
- (void)doConnect
{
    _participantsNumber = 0;
    OTError *error = nil;
    if ([kToken isEqualToString:@""]) {
        [_session connectWithToken:credentials.token error:&error];
    } else {
        [_session connectWithToken:kToken error:&error];
    }
    if (error) {
        [self showAlert:[error localizedDescription]];
    }
}

- (void)doPublish
{
    OTPublisherSettings *settings = [[OTPublisherSettings alloc] init];
    settings.name = [UIDevice currentDevice].name;
    settings.videoCapture = _capturer;
    _publisher = [[OTPublisher alloc] initWithDelegate:self settings:settings];
    _publisher.rtcStatsReportDelegate = self;
    OTError *error = nil;
    [_session publish:_publisher error:&error];
    if (error)
    {
        [self showAlert:[error localizedDescription]];
    }
}

/**
 * Cleans up the publisher and its view. At this point, the publisher should not
 * be attached to the session any more.
 */
- (void)cleanupPublisher {
    [_publisher.view removeFromSuperview];
    _publisher = nil;
}

- (void)doSubscribe:(OTStream*)stream
{
    _renderer = [[Renderer alloc] initWithUnityRenderingEnabled:kUnityRenderingEnabled unity:_unityFramework];
    _subscriber = [[OTSubscriber alloc] initWithStream:stream delegate:self];
    _subscriber.rtcStatsReportDelegate = self;
    [_subscriber setVideoRender:_renderer];
    OTError *error = nil;
    [_session subscribe:_subscriber error:&error];
    if (error)
    {
        [self showAlert:[error localizedDescription]];
    }
}

- (void)cleanupSubscriber
{
    [_renderer clearRenderBuffer];
    _subscriber = nil;
}

# pragma mark - OTSession delegate callbacks

- (void)sessionDidConnect:(OTSession*)session
{
    NSLog(@"sessionDidConnect (%@)", session.sessionId);
    ++_participantsNumber;

    dispatch_async(dispatch_get_main_queue(), ^{
        [NSTimer scheduledTimerWithTimeInterval:0.5 repeats:NO block:^(NSTimer * _Nonnull timer) {
            if (self->_participantsNumber > MAX_PARTICIPANTS_PER_ROOM) {
                [session disconnect:nil];
                NSLog(@"sessionDidConnect (%d participants)", self->_participantsNumber);
                [self showAlert:@"Room is full. Disconnecting."];
                return;
            }

            if (self->_sender) {
                [self doPublish];
            }
        }];
    });
}

- (void)sessionDidDisconnect:(OTSession*)session
{
    NSString* alertMessage =
    [NSString stringWithFormat:@"Session disconnected: (%@)",
     session.sessionId];
    NSLog(@"sessionDidDisconnect (%@)", alertMessage);
}


- (void)session:(OTSession*)mySession
  streamCreated:(OTStream *)stream
{
    NSLog(@"session streamCreated (%@)", stream.streamId);

    if ((nil == _subscriber) && (_sender == NO)) {
        [self doSubscribe:stream];
    }
}

- (void)session:(OTSession*)session
streamDestroyed:(OTStream *)stream
{
    NSLog(@"session streamDestroyed (%@)", stream.streamId);

    if ([_subscriber.stream.streamId isEqualToString:stream.streamId])
    {
        [self cleanupSubscriber];
    }
}

- (void) session:(OTSession *)session
connectionCreated:(OTConnection *)connection
{
    NSLog(@"session connectionCreated (%@)", connection.connectionId);
    // Sent when another client connects to the session.
    // This message is not sent when your own client connects to the session.
    ++_participantsNumber;
}

- (void) session:(OTSession *)session
connectionDestroyed:(OTConnection *)connection
{
    NSLog(@"session connectionDestroyed (%@)", connection.connectionId);
    // Sent when another client disconnects from the session.
    // This message is not sent when your own client disconnects from the session.
    --_participantsNumber;
    if ([_subscriber.stream.connection.connectionId
         isEqualToString:connection.connectionId])
    {
        [self cleanupSubscriber];
    }
}

- (void) session:(OTSession*)session
didFailWithError:(OTError*)error
{
    NSLog(@"didFailWithError: (%@)", error);
}

# pragma mark - OTSubscriber delegate callbacks
- (void)subscriberDidConnectToStream:(OTSubscriberKit*)subscriber
{
    NSLog(@"subscriberDidConnectToStream (%@)",
          subscriber.stream.connection.connectionId);
    assert(_subscriber == subscriber);
    dispatch_async(dispatch_get_main_queue(), ^{
        [NSTimer scheduledTimerWithTimeInterval:3 repeats:YES block:^(NSTimer * _Nonnull timer) {
            [self->_subscriber getRtcStatsReport];
        }];
    });
}

- (void)subscriber:(OTSubscriberKit*)subscriber
  didFailWithError:(OTError*)error
{
    NSLog(@"subscriber %@ didFailWithError %@",
          subscriber.stream.streamId,
          error);
}

# pragma mark - OTPublisher delegate callbacks
- (void)publisher:(OTPublisherKit *)publisher
    streamCreated:(OTStream *)stream
{
    NSLog(@"Publishing");
    dispatch_async(dispatch_get_main_queue(), ^{
        [NSTimer scheduledTimerWithTimeInterval:3 repeats:YES block:^(NSTimer * _Nonnull timer) {
            [self->_publisher getRtcStatsReport];
        }];
    });
}

- (void)publisher:(OTPublisherKit*)publisher
  streamDestroyed:(OTStream *)stream
{
    if ([_subscriber.stream.streamId isEqualToString:stream.streamId])
    {
        [self cleanupSubscriber];
    }

    [self cleanupPublisher];
}

- (void)publisher:(OTPublisherKit*)publisher
 didFailWithError:(OTError*) error
{
    NSLog(@"publisher didFailWithError %@", error);
    [self cleanupPublisher];
}

- (void)showAlert:(NSString *)string
{
    // show alertview on main UI
    dispatch_async(dispatch_get_main_queue(), ^{
        UIAlertController *alertVC = [UIAlertController alertControllerWithTitle:@"OTError"
                                                                         message:string
                                                                  preferredStyle:UIAlertControllerStyleAlert];
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

        [_publisherStatsLabel removeFromSuperview];
        [_publisherStatsLabel setText:stats];
        [_publisherStatsLabel setNumberOfLines:0];
        [_localVideoView addSubview:_publisherStatsLabel];
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

    [_subscriberStatsLabel removeFromSuperview];
    [_subscriberStatsLabel setText:stats];
    [_subscriberStatsLabel setNumberOfLines:0];
    if (kUnityRenderingEnabled) {
        [[[[self unityFramework] appController] rootView]addSubview:_subscriberStatsLabel];
    } else {
        [_subscriber.view addSubview:_subscriberStatsLabel];
    }
}

- (void)roomNameAndRoleNotification:(NSNotification *)notification {
    NSDictionary *userInfo = notification.userInfo;
    NSLog(@"Notification received with userInfo: %@", userInfo);
    _sender = false;
    if([userInfo objectForKey:@"isSender"]){
        _sender = [userInfo valueForKey:@"isSender"];
    }
    
    if([userInfo objectForKey:@"roomName"]){
        _roomName = [userInfo valueForKey:@"roomName"];
    }
    
    if(_sender){
        dispatch_async(dispatch_get_main_queue(), ^{
            self->_localVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectMake(0, 0, self.view.bounds.size.width, self.view.bounds.size.height)];
            self->_capturer = [[Capturer alloc] initWithCapturePreset:AVCaptureSessionPreset640x480 andDelegate:self->_localVideoView];
            [self->_capturer startCaptureCompletionHandler:^(NSError * error) {
                dispatch_sync(dispatch_get_main_queue(), ^{
                    if(!error){
                        [self.view addSubview:self->_localVideoView];
                        [self dismissViewControllerAnimated:YES completion:nil];
                    }
                });
            }];
        });
    }else{
        self->_subscriberStatsLabel = [[UILabel alloc] initWithFrame:CGRectMake(5, 200, 300, 400)];
        [self->_subscriberStatsLabel setFont:[UIFont fontWithName: @"Arial-BoldMT" size:15.f]];
        [self->_subscriberStatsLabel setTextColor:[UIColor whiteColor]];
        [self->_subscriberStatsLabel setBackgroundColor:[UIColor clearColor]];
    }
    [self doInit];
}

@end
