#import "ViewController.h"

#import <TargetConditionals.h>

#import <OpenTok/OpenTok.h>

#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>

#if !(TARGET_IPHONE_SIMULATOR)
#import "Capturer.h"
#import "Renderer.h"
#endif

#import "Logger.h"

// Note: Define SKIP_USING_VONAGE_EHC_SUBSCRIBER_RENDERER macro whenever
//       you want to use the OpenTok default video render.
//#define SKIP_USING_VONAGE_EHC_SUBSCRIBER_RENDERER

#define MAX_PARTICIPANTS_PER_ROOM 2

typedef struct {
    NSString* apiKey;
    NSString* sessionId;
    NSString* token;
} HoloCredentials;

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
static NSString* const kHoloRoomName = @"holo";

static double widgetHeight = 240;
static double widgetWidth = 320;

@interface ViewController ()<OTSessionDelegate, OTSubscriberDelegate, OTPublisherDelegate, NSURLSessionDelegate, OTPublisherKitRtcStatsReportDelegate, OTSubscriberKitRtcStatsReportDelegate>
@property (nonatomic) OTSession *session;
@property (nonatomic) OTPublisher *publisher;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *localVideoView;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *remoteVideoView;
#if !(TARGET_IPHONE_SIMULATOR)
@property (nonatomic) Renderer *renderer;
#endif
@property (nonatomic) OTSubscriber *subscriber;
@property (nonatomic) UILabel* publisherStatsLabel;
@property (nonatomic) UILabel* subscriberStatsLabel;
@end

@implementation ViewController {
    UIView *_view;
    HoloCredentials credentials;
    BOOL sender;
    uint8_t _participantsNumber;
}

#pragma mark - View lifecycle

- (void)loadView {
    _view = [[UIView alloc] initWithFrame:CGRectZero];
    _remoteVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectZero];
    _remoteVideoView.translatesAutoresizingMaskIntoConstraints = NO;
    [_view addSubview:_remoteVideoView];

    _localVideoView = [[RTC_OBJC_TYPE(RTCMTLVideoView) alloc] initWithFrame:CGRectZero];
    _localVideoView.translatesAutoresizingMaskIntoConstraints = NO;
    [_view addSubview:_localVideoView];

    UILayoutGuide *margin = _view.layoutMarginsGuide;
    [_remoteVideoView.leadingAnchor constraintEqualToAnchor:margin.leadingAnchor].active = YES;
    [_remoteVideoView.topAnchor constraintEqualToAnchor:margin.topAnchor].active = YES;
    [_remoteVideoView.trailingAnchor constraintEqualToAnchor:margin.trailingAnchor].active = YES;
    [_remoteVideoView.bottomAnchor constraintEqualToAnchor:margin.bottomAnchor].active = YES;

    [_localVideoView.leadingAnchor constraintEqualToAnchor:margin.leadingAnchor constant:8.0].active = YES;
    [_localVideoView.topAnchor constraintEqualToAnchor:margin.topAnchor constant:8.0].active = YES;
    [_localVideoView.widthAnchor constraintEqualToConstant:120].active = YES;
    [_localVideoView.heightAnchor constraintEqualToConstant:120].active = YES;

    _publisherStatsLabel = [[UILabel alloc] initWithFrame:CGRectMake(5, 200, 300, 400)];
    [_publisherStatsLabel setFont:[UIFont fontWithName: @"Arial-BoldMT" size:15.f]];
    [_publisherStatsLabel setTextColor:[UIColor whiteColor]];
    [_publisherStatsLabel setBackgroundColor:[UIColor clearColor]];

    _subscriberStatsLabel = [[UILabel alloc] initWithFrame:CGRectMake(5, 200, 300, 400)];
    [_subscriberStatsLabel setFont:[UIFont fontWithName: @"Arial-BoldMT" size:15.f]];
    [_subscriberStatsLabel setTextColor:[UIColor whiteColor]];
    [_subscriberStatsLabel setBackgroundColor:[UIColor clearColor]];

    self.view = _view;
}

- (void)viewDidLoad
{
    [super viewDidLoad];

    sender = YES;
    UIAlertController *alert = [UIAlertController
                                alertControllerWithTitle:@"Role"
                                message:@"Select one rol please"
                                preferredStyle:UIAlertControllerStyleAlert];
    UIAlertAction* yesButton = [UIAlertAction
                                actionWithTitle:@"Sender"
                                style:UIAlertActionStyleDefault
                                handler:^(UIAlertAction * action) {
        self->sender = YES;
        [self doInit];
    }];
    UIAlertAction* noButton = [UIAlertAction
                               actionWithTitle:@"Receiver"
                               style:UIAlertActionStyleDefault
                               handler:^(UIAlertAction * action) {
        self->sender = FALSE;
        [self doInit];
    }];
    [alert addAction:yesButton];
    [alert addAction:noButton];
    dispatch_async(dispatch_get_main_queue(), ^{
        [self presentViewController:alert animated:YES completion:nil];
    });
}

- (void)doInit {
    //    [[OpenTokLogger alloc] init];

    if (![kApiKey isEqualToString:@""] && ![kSessionId isEqualToString:@""]) {
        // Step 1: As the view comes into the foreground, initialize a new instance
        // of OTSession and begin the connection process.
        _session = [[OTSession alloc] initWithApiKey:kApiKey
                                           sessionId:kSessionId
                                            delegate:self];
        [self doConnect];
        return;
    }
    // TODO: Revert this when AMR is disabled for the application ID used by the room service.
    //    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:kHoloRoomServiceURI, kHoloRoomName]];
    NSURL *url = [NSURL URLWithString:@"http://3.19.223.109:8080"];
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
                if ([dict objectForKey:@"applicationId"] &&
                    [dict objectForKey:@"sessionId"] &&
                    [dict objectForKey:@"token"]) {
                    self->credentials.apiKey = [dict objectForKey:@"applicationId"];
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

/**
 * Asynchronously begins the session connect process. Some time later, we will
 * expect a delegate method to call us back with the results of this action.
 */
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

/**
 * Sets up an instance of OTPublisher to use with this session. OTPubilsher
 * binds to the device camera and microphone, and will provide A/V streams
 * to the OpenTok session.
 */
- (void)doPublish
{
    OTPublisherSettings *settings = [[OTPublisherSettings alloc] init];
    settings.name = [UIDevice currentDevice].name;
#if !(TARGET_IPHONE_SIMULATOR)
    Capturer* capturer = [[Capturer alloc] initWithCapturePreset:AVCaptureSessionPreset640x480];
    settings.videoCapture = capturer;
#endif
    _publisher = [[OTPublisher alloc] initWithDelegate:self settings:settings];
    _publisher.rtcStatsReportDelegate = self;

    OTError *error = nil;
    [_session publish:_publisher error:&error];
    if (error)
    {
        [self showAlert:[error localizedDescription]];
    }

#if !(TARGET_IPHONE_SIMULATOR)
    [_localVideoView addSubview:_publisher.view];
#else
    [self.view addSubview:_publisher.view];
#endif
    [_publisher.view setFrame:CGRectMake(0, 0, widgetWidth, widgetHeight)];
}

/**
 * Cleans up the publisher and its view. At this point, the publisher should not
 * be attached to the session any more.
 */
- (void)cleanupPublisher {
    [_publisher.view removeFromSuperview];
    _publisher = nil;
}

/**
 * Instantiates a subscriber for the given stream and asynchronously begins the
 * process to begin receiving A/V content for this stream. Unlike doPublish,
 * this method does not add the subscriber to the view hierarchy. Instead, we
 * add the subscriber only after it has connected and begins receiving data.
 */
- (void)doSubscribe:(OTStream*)stream
{
#if !(TARGET_IPHONE_SIMULATOR)
#ifndef SKIP_USING_VONAGE_EHC_SUBSCRIBER_RENDERER
    _renderer = [[Renderer alloc] initWithUnityRenderingEnabled:YES];
    [_renderer updateView:_remoteVideoView];
#endif
#endif
    _subscriber = [[OTSubscriber alloc] initWithStream:stream delegate:self];
    _subscriber.rtcStatsReportDelegate = self;
#if !(TARGET_IPHONE_SIMULATOR)
#ifndef SKIP_USING_VONAGE_EHC_SUBSCRIBER_RENDERER
    [_subscriber setVideoRender:_renderer];
#endif
#endif

    OTError *error = nil;
    [_session subscribe:_subscriber error:&error];
    if (error)
    {
        [self showAlert:[error localizedDescription]];
    }
}

/**
 * Cleans the subscriber from the view hierarchy, if any.
 * NB: You do *not* have to call unsubscribe in your controller in response to
 * a streamDestroyed event. Any subscribers (or the publisher) for a stream will
 * be automatically removed from the session during cleanup of the stream.
 */
- (void)cleanupSubscriber
{
#if !(TARGET_IPHONE_SIMULATOR)
    [_renderer clearRenderBuffer];
#else
    [_subscriber.view removeFromSuperview];
#endif
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

            if (self->sender) {
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

    if ((nil == _subscriber) && (sender == NO)) {
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

- (void)  session:(OTSession *)session
connectionCreated:(OTConnection *)connection
{
    NSLog(@"session connectionCreated (%@)", connection.connectionId);
    // Sent when another client connects to the session.
    // This message is not sent when your own client connects to the session.
    ++_participantsNumber;
}

- (void)    session:(OTSession *)session
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
#if (TARGET_IPHONE_SIMULATOR)
    [_subscriber.view setFrame:CGRectMake(0, widgetHeight, widgetWidth,
                                          widgetHeight)];
    [self.view addSubview:_subscriber.view];
#else
#ifdef SKIP_USING_VONAGE_EHC_SUBSCRIBER_RENDERER
    [_subscriber.view setFrame:CGRectMake(0, widgetHeight, widgetWidth,
                                          widgetHeight)];
    [self.view addSubview:_subscriber.view];
#endif
#endif
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

-(void) viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    [_session unsubscribe:_subscriber error:nil];
    _subscriber = nil;
    [_session unpublish:_publisher error:nil];
    _publisher = nil;
    [_session disconnect:nil];
    _session = nil;
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
#ifndef SKIP_USING_VONAGE_EHC_SUBSCRIBER_RENDERER
    [_remoteVideoView addSubview:_subscriberStatsLabel];
#else
    [_subscriber.view addSubview:_subscriberStatsLabel];
#endif
}

@end
