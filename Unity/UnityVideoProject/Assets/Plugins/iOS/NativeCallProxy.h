// [!] important set UnityFramework in Target Membership for this file
// [!]           and set Public header visibility

#ifndef NATIVECALLPROXY_H_
#define NATIVECALLPROXY_H_

#import <Foundation/Foundation.h>
#import <memory>

__attribute__ ((visibility("default")))
@interface FrameworkLibAPI : NSObject
// call it any time after UnityFrameworkLoad to set object implementing NativeCallsProtocol methods
+ (void) setInputBufferCpp:(uint32_t*)buffer rgbSize:(uint32_t)rgb_size augmentedBuffer:(uint8_t*)augmentedBuffer augmentedSize:(uint32_t)augmented_size rotation:(int)rotation;
+ (void) getOutputBufferCpp:(std::unique_ptr<uint32_t[]>&)buffer size:(uint32_t&)size;
@end

#endif //NATIVECALLPROXY_H_


