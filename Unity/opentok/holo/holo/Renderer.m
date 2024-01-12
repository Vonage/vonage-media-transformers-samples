#import "Renderer.h"

#include <UnityFramework/NativeCallProxy.h>

@interface Renderer ()
@property(nonatomic, weak) id<RendererDelegate> delegate;
@end

@implementation Renderer {
    BOOL _renderingEnabled;
}

@synthesize delegate = _delegate;

#pragma mark - Public

- (BOOL)mirroring {
    return YES;
}

- (void)setMirroring:(BOOL)mirroring {
}

- (BOOL)renderingEnabled {
    return YES;
}

- (void)setRenderingEnabled:(BOOL)renderingEnabled {
}

- (void)clearRenderBuffer {
}

#pragma mark - OTVideoRender

- (void)renderVideoFrame:(OTVideoFrame*)frame {
    if ([_delegate respondsToSelector:@selector(renderer:didReceiveFrame:)]) {
        [_delegate renderer:self didReceiveFrame:frame];
    }
    if (frame == nil) {
        return;
    }
    NSLog(@"[holo]: Renderer %p renderVideoFrame frame width is %u", self, frame.format.imageWidth);
    NSLog(@"[holo]: Renderer %p renderVideoFrame frame heigth is %u", self, frame.format.imageHeight);
    NSData *data = [frame metadata];
    NSLog(@"[holo]: Renderer %p renderVideoFrame augmented data size is %lu", self, static_cast<size_t>(data.length));
    uint32_t inputWidth = 0;
    uint32_t inputHeigth = 0;
    [FrameworkLibAPI getInputWidth:inputWidth height:inputHeigth];
    NSLog(@"[holo]: Renderer %p renderVideoFrame inputWidth is %u and inputHeigth is %u", self, inputWidth, inputHeigth);
    if ((inputWidth == 0) || (inputHeigth == 0)) {
        return;
    }
}

- (void)updateDelegate:(nullable id<RendererDelegate>)delegate {
    self.delegate = delegate;
}

@end
