#import "ViewController.h"

#import <TargetConditionals.h>

#import <OpenTok/OpenTok.h>

#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>

#if !(TARGET_IPHONE_SIMULATOR)
#import "Capturer.h"
#import "Renderer.h"
#endif

#import "Logger.h"

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

@interface ViewController ()<OTSessionDelegate, OTSubscriberDelegate, OTPublisherDelegate, NSURLSessionDelegate>
@property (nonatomic) OTSession *session;
@property (nonatomic) OTPublisher *publisher;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *localVideoView;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *remoteVideoView;
#if !(TARGET_IPHONE_SIMULATOR)
@property (nonatomic) Renderer *renderer;
#endif
@property (nonatomic) OTSubscriber *subscriber;
@end

@implementation ViewController {
    UIView *_view;
    HoloCredentials credentials;
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

    self.view = _view;
}

- (void)viewDidLoad
{
    [super viewDidLoad];

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

    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:kHoloRoomServiceURI, kHoloRoomName]];
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
    _renderer = [[Renderer alloc] init];
    [_renderer updateView:_remoteVideoView];
#endif
    _subscriber = [[OTSubscriber alloc] initWithStream:stream delegate:self];
#if !(TARGET_IPHONE_SIMULATOR)
    [_subscriber setVideoRender:_renderer];
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

    // Step 2: We have successfully connected, now instantiate a publisher and
    // begin pushing A/V streams into OpenTok.
    [self doPublish];
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

    if (nil == _subscriber)
    {
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
}

- (void)    session:(OTSession *)session
connectionDestroyed:(OTConnection *)connection
{
    NSLog(@"session connectionDestroyed (%@)", connection.connectionId);
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
#if (TARGET_IPHONE_SIMULATOR)
    [_subscriber.view setFrame:CGRectMake(0, widgetHeight, widgetWidth,
                                         widgetHeight)];
    [self.view addSubview:_subscriber.view];
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

@end
