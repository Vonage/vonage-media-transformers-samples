#import <OpenTok/OpenTok.h>

#import <sdk/objc/components/renderer/metal/RTCMTLRenderer.h>
#import <sdk/objc/components/renderer/metal/RTCMTLVideoView.h>

@protocol RendererDelegate;

@interface Renderer : NSObject <OTVideoRender>

@property (nonatomic, assign) BOOL mirroring;
@property (nonatomic, assign) BOOL renderingEnabled;

-(void)updateView:(nullable RTC_OBJC_TYPE(RTCMTLVideoView)*)videoView;
-(void)updateDelegate:(nullable id<RendererDelegate>)delegate;

/*
 * Clears the render buffer to a black frame
 */
- (void)clearRenderBuffer;

@end

/**
 * Used to notify the owner of this renderer that frames are being received.
 * For our example, we'll use this to wire a notification to the subscriber's
 * delegate that video has arrived.
 */
@protocol RendererDelegate <NSObject>

- (void)renderer:(nullable Renderer*)renderer
 didReceiveFrame:(nullable OTVideoFrame*)frame;

@end