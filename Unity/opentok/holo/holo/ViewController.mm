#import "ViewController.h"

#import <OpenTok/OpenTok.h>

#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>

#import "Renderer.h"

// *** Fill the following variables using your own Project info  ***
// ***          https://dashboard.tokbox.com/projects            ***
// Replace with your OpenTok API key
static NSString* const kApiKey = @"";
// Replace with your generated session ID
static NSString* const kSessionId = @"";
// Replace with your generated token
static NSString* const kToken = @"";

static double widgetHeight = 240;
static double widgetWidth = 320;

@interface ViewController ()<OTSessionDelegate, OTSubscriberDelegate, OTPublisherDelegate>
@property (nonatomic) OTSession *session;
@property (nonatomic) OTPublisher *publisher;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *localVideoView;
@property (nonatomic) __kindof UIView<RTC_OBJC_TYPE(RTCVideoRenderer)> *remoteVideoView;
@property (nonatomic) Renderer *renderer;
@property (nonatomic) OTSubscriber *subscriber;
@end

@implementation ViewController {
    UIView *_view;
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

    // Step 1: As the view comes into the foreground, initialize a new instance
    // of OTSession and begin the connection process.
    _session = [[OTSession alloc] initWithApiKey:kApiKey
                                       sessionId:kSessionId
                                        delegate:self];
    [self doConnect];
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

    [_session connectWithToken:kToken error:&error];
    if (error)
    {
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
    _publisher = [[OTPublisher alloc] initWithDelegate:self settings:settings];

    OTError *error = nil;
    [_session publish:_publisher error:&error];
    if (error)
    {
        [self showAlert:[error localizedDescription]];
    }

//    [self.view addSubview:_publisher.view];
    [_localVideoView addSubview:_publisher.view];
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
    _renderer = [[Renderer alloc] init];
    [_renderer updateView:_remoteVideoView];
    _subscriber = [[OTSubscriber alloc] initWithStream:stream delegate:self];
    [_subscriber setVideoRender:_renderer];

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
    [_renderer clearRenderBuffer];
//    [_subscriber.view removeFromSuperview];
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
//    [_subscriber.view setFrame:CGRectMake(0, widgetHeight, widgetWidth,
//                                         widgetHeight)];
//    [self.view addSubview:_subscriber.view];
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

@end
