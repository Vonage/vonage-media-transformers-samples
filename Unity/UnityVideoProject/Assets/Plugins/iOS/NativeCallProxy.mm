#import <Foundation/Foundation.h>
#import "NativeCallProxy.h"


#include <memory>

#define EXPORT __attribute__((visibility("default")))

class unityBridge;
typedef std::shared_ptr<unityBridge> unityBridgePtr;


class unityBridge {
public:
    static unityBridgePtr instance_;
    static unityBridgePtr getBridge(){
        return instance_;
    }
    unityBridge(){
        inputArray_ = nullptr;
        outputArray_ = nullptr;
        inputArraySize_ = 0;
        outputArraySize_ = 0;
        inputRotation_ = outputRotation_ = 0;
        unityRenderer_ = false;
        inputWidth_ = inputHeight_ = outputWidth_ = outputHeight_ = 0;
    }
    
    void getOutput(std::unique_ptr<uint8_t[]>& buffer, uint32_t& size){
        size = 0;
        buffer = nullptr;
        if(outputArray_ && outputArraySize_ > 0){
            size = outputArraySize_;
            buffer = std::make_unique<uint8_t[]>(outputArraySize_);
            memcpy(buffer.get(), outputArray_, outputArraySize_ * sizeof(uint8_t));
        }
    }
    
    void initInputBuffer(uint8_t* rgb_buffer, uint32_t rgb_size, uint8_t* augmented_buffer, uint32_t augmented_size){
        inputArraySize_ = rgb_size;
        if(inputArraySize_ > 0 && rgb_buffer){
            inputArray_ = rgb_buffer;
        }

        inputAugmentedArraySize_ = augmented_size;
        if(inputAugmentedArraySize_ > 0 && augmented_buffer){
            inputAugmentedArray_ = augmented_buffer;
        }
    }

    void initOutputBuffer(uint8_t* output_buffer, uint32_t size){
        outputArraySize_ = size;
        if(outputArraySize_ > 0 && output_buffer){
            outputArray_ = output_buffer;
        }
    }

    void setInputBufferData(uint8_t *bufferData, uint32_t size){
        if(inputArray_ && inputArraySize_ > 0){
            memset(inputArray_, 0, inputArraySize_ * sizeof(uint8_t));
            if(size > 0){
                uint32_t final_size = size > inputArraySize_ ? inputArraySize_ : size;
                memcpy(inputArray_, bufferData, final_size * sizeof(uint8_t));
            }
        }
    }

    void setInputAugmentedBufferData(uint8_t* bufferData, uint32_t size){
        if(inputAugmentedArray_ && inputAugmentedArraySize_ > 0){
            memset(inputAugmentedArray_, 0, inputAugmentedArraySize_ * sizeof(uint8_t));
            if(size > 0){
                uint32_t final_size = size > inputAugmentedArraySize_ ? inputAugmentedArraySize_ : size;
                memcpy(inputAugmentedArray_, bufferData, final_size * sizeof(uint8_t));
            }
        }
    }

    void setInputRotation(uint32_t rotation){
        inputRotation_ = rotation;
    }

    int getInputRotation(){
        return inputRotation_;
    }
    
    void setOutputRotation(uint32_t rotation){
        outputRotation_ = rotation;
    }

    int getOutputRotation(){
        return outputRotation_;
    }
    
    void setInputWidth(const int32_t& width){
        inputWidth_ = width;
    }
    
    uint32_t getInputWidth() const{
        return inputWidth_;
    }
    
    void setInputHeight(const int32_t& height){
        inputHeight_ = height;
    }
    
    uint32_t getInputHeight() const{
        return inputHeight_;
    }
    
    void setOutputWidth(const int32_t& width){
        outputWidth_ = width;
    }
    
    uint32_t getOutputWidth() const{
        return outputWidth_;
    }
    
    void setOutputHeight(const int32_t& height){
        outputHeight_ = height;
    }
    
    uint32_t getOutputHeight() const{
        return outputHeight_;
    }
    
    void setUnityRenderer(bool unityRenderer){
        unityRenderer_ = unityRenderer;
    }

    bool getUnityRenderer() const {
        return unityRenderer_;
    }

private:
    uint8_t* inputArray_;
    uint8_t* inputAugmentedArray_;
    uint8_t* outputArray_;
    
    uint32_t inputArraySize_;
    uint32_t inputAugmentedArraySize_;
    uint32_t outputArraySize_;
    uint8_t inputRotation_;
    uint8_t outputRotation_;
    
    uint32_t inputWidth_;
    uint32_t inputHeight_;
    uint32_t outputWidth_;
    uint32_t outputHeight_;

    bool unityRenderer_;
};

unityBridgePtr unityBridge::instance_ = std::make_shared<unityBridge>();

extern "C"{

    void __stdcall initInputBuffersCS(uint8_t* rgb_buffer, uint32_t rgb_size, uint8_t* augmented_buffer, uint32_t augmented_size){
        unityBridge::getBridge()->initInputBuffer(rgb_buffer, rgb_size, augmented_buffer, augmented_size);
    }

    void __stdcall initOutputBufferCS(uint8_t* output_buffer, uint32_t size){
        unityBridge::getBridge()->initOutputBuffer(output_buffer, size);
    }

    int __stdcall getInputRotationCS(){
        return unityBridge::getBridge()->getInputRotation();
    }

    void __stdcall setOutputRotationCS(uint32_t rotation){
        unityBridge::getBridge()->setOutputRotation(rotation);
    }

    void __stdcall setInputWidthCS(uint32_t width){
        unityBridge::getBridge()->setInputWidth(width);
    }

    void __stdcall setInputHeightCS(uint32_t height){
        unityBridge::getBridge()->setInputHeight(height);
    }

    void __stdcall setOutputWidthCS(uint32_t width){
        unityBridge::getBridge()->setOutputWidth(width);
    }

    void __stdcall setOutputHeightCS(uint32_t height){
        unityBridge::getBridge()->setOutputHeight(height);
    }

    void __stdcall setRoomNameAndRoleCS(uint8_t* roomName, bool isSender){
        NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];
        if(roomName != nullptr){
            NSString* nsRoomName = [NSString stringWithUTF8String:(char*)roomName];
            NSDictionary *roomInfo = @{@"roomName": nsRoomName, @"isSender": @(isSender)};
            [notificationCenter postNotificationName:kRoomNameAndRoleNotification
                                                      object:nil
                                                    userInfo:roomInfo];
        }
    }

    bool __stdcall getUnityRendererCS(){
        return unityBridge::getBridge()->getUnityRenderer();
    }
}

@implementation FrameworkLibAPI

+ (void) getOutputBufferCpp:(std::unique_ptr<uint8_t[]>&)buffer size:(uint32_t&)size
{
    buffer = nullptr;
    size = 0;
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return;
    
    return bridge->getOutput(buffer, size);
}

+ (void) setInputBufferCpp:(uint8_t*)buffer rgbSize:(uint32_t)rgb_size augmentedBuffer:(uint8_t*)augmentedBuffer augmentedSize:(uint32_t)augmented_size rotation:(int)rotation
{
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return;
    
    bridge->setInputBufferData(buffer, rgb_size);
    bridge->setInputAugmentedBufferData(augmentedBuffer, augmented_size);
    bridge->setInputRotation(rotation);
}

+ (void)getInputWidth:(uint32_t &)width height:(uint32_t &)height {
    auto bridge = unityBridge::getBridge();
    width = height = 0;
    if(bridge == nullptr) return;
    width = bridge->getInputWidth();
    height = bridge->getInputHeight();
}

+ (void)getOutputWidth:(uint32_t &)width height:(uint32_t &)height rotation:(uint8_t&)rotation {
    auto bridge = unityBridge::getBridge();
    width = height = rotation = 0;
    if(bridge == nullptr) return;
    width = bridge->getOutputWidth();
    height = bridge->getOutputHeight();
    rotation = bridge->getOutputRotation();
}

+ (void) setUnityRenderer:(bool)unityRenderer{
    auto bridge = unityBridge::getBridge();
    if(bridge == nullptr) return;
    bridge->setUnityRenderer(unityRenderer);
}

@end

