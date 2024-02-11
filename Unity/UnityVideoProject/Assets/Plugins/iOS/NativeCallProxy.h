// [!] important set UnityFramework in Target Membership for this file
// [!]           and set Public header visibility

#ifndef NATIVECALLPROXY_H_
#define NATIVECALLPROXY_H_

#import <Foundation/Foundation.h>
#import <memory>

__attribute__((visibility("default"))) NSString *const kRoomNameAndRoleNotification = @"RoomNameAndRoleNotification";

__attribute__ ((visibility("default")))
@interface FrameworkLibAPI : NSObject
// call it any time after UnityFrameworkLoad to set object implementing NativeCallsProtocol methods
+ (void) setInputBufferCpp:(uint8_t*)buffer rgbSize:(uint32_t)rgb_size augmentedBuffer:(uint8_t*)augmentedBuffer augmentedSize:(uint32_t)augmented_size rotation:(int)rotation;
+ (void) getOutputBufferCpp:(std::unique_ptr<uint8_t[]>&)buffer size:(uint32_t&)size;
+ (void) getInputWidth:(uint32_t&)width height:(uint32_t&)height;
+ (void) getOutputWidth:(uint32_t&)width height:(uint32_t&)height rotation:(uint8_t&)rotation;
@end

#endif //NATIVECALLPROXY_H_
