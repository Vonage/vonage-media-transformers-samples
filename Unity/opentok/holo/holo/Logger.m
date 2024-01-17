#import "Logger.h"

@interface OpenTokObjC : NSObject
+ (void)setLogBlockQueue:(dispatch_queue_t)queue;
+ (void)setLogBlock:(void (^)(NSString* message, void* arg))logBlock;
@end

static dispatch_queue_t _logQueue;

@implementation OpenTokLogger
+ (void)initialize {
    _logQueue = dispatch_queue_create("log-queue", DISPATCH_QUEUE_SERIAL);
    [OpenTokObjC setLogBlockQueue:_logQueue];
    [OpenTokObjC setLogBlock:^(NSString *message, void *arg) {
        NSLog(@"[OpenTok]%@", message);
    }];
}
@end

