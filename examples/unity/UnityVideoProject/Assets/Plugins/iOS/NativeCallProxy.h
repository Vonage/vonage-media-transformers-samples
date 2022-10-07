// [!] important set UnityFramework in Target Membership for this file
// [!]           and set Public header visibility

#import <Foundation/Foundation.h>

__attribute__ ((visibility("default")))
@interface FrameworkLibAPI : NSObject
// call it any time after UnityFrameworkLoad to set object implementing NativeCallsProtocol methods
+ (uint32_t*) getInputBufferCpp;
+ (void) setInputBufferCpp: (uint32_t*) buffer;
+ (uint32_t*) getOutputBufferCpp;
@end


