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
        rotation_ = 0;
        newBufferDataAvailable_ = false;
    }
    
    void getOutput(std::unique_ptr<uint32_t[]>& buffer, uint32_t& size){
        size = 0;
        buffer = nullptr;
        if(outputArray_ && outputArraySize_ > 0){
            size = outputArraySize_;
            buffer = std::make_unique<uint32_t[]>(outputArraySize_);
            memcpy(buffer.get(), outputArray_.get(), outputArraySize_ * sizeof(uint32_t));
        }
    }

    bool isNewBufferDataAvailable()
    {
        return newBufferDataAvailable_;
    }

    void setNewBufferDataAvailable(bool value)
    {
        newBufferDataAvailable_ = value;
    }
    
    void initInputBuffer(uint32_t rgb_size, uint32_t augmented_size){
        inputArraySize_ = rgb_size;
        if(inputArraySize_ > 0){
            inputArray_ = std::make_unique<uint32_t[]>(inputArraySize_);
            memset(inputArray_.get(), 0, inputArraySize_ * sizeof(uint32_t));
        }

        inputAugmentedArraySize_ = augmented_size;
        if(inputAugmentedArraySize_ > 0){
            inputAugmentedArray_ = std::make_unique<uint8_t[]>(inputAugmentedArraySize_);
            memset(inputAugmentedArray_.get(), 0, inputAugmentedArraySize_ * sizeof(uint8_t));
        }
    }

    void initOutputBuffer(uint32_t size){
        outputArraySize_ = size;
        if(outputArraySize_ > 0){
            outputArray_ = std::make_unique<uint32_t[]>(outputArraySize_);
            memset(outputArray_.get(), 0, size * sizeof(uint32_t));
        }
    }

    void copyInputArray(uint32_t *outArray, uint8_t* outAugmentedBuffer)
    {
        if(outArray && inputArray_ && inputArraySize_ > 0){
            memcpy(outArray, inputArray_.get(), inputArraySize_ * sizeof(uint32_t));
        } 
        
        if(outAugmentedBuffer && inputAugmentedArray_ && inputAugmentedArraySize_ > 0){
            memcpy(outAugmentedBuffer, inputAugmentedArray_.get(), inputAugmentedArraySize_ * sizeof(uint8_t));
        }
    }

    void setInputBufferData(uint32_t *bufferData, uint32_t size){
        if(inputArray_ && inputArraySize_ > 0){
            memset(inputArray_.get(), 0, inputArraySize_ * sizeof(uint32_t));
            if(size > 0){
                uint32_t final_size = size > inputArraySize_ ? inputArraySize_ : size;
                memcpy(inputArray_.get(), bufferData, final_size * sizeof(uint32_t));
            }
        }
    }

    void setInputAugmentedBufferData(uint8_t* bufferData, uint32_t size){
        if(inputAugmentedArray_ && inputAugmentedArraySize_ > 0){
            memset(inputAugmentedArray_.get(), 0, inputAugmentedArraySize_ * sizeof(uint8_t));
            if(size > 0){
                uint32_t final_size = size > inputAugmentedArraySize_ ? inputAugmentedArraySize_ : size;
                memcpy(inputAugmentedArray_.get(), bufferData, final_size * sizeof(uint8_t));
            }
        }
    }

    void setOutputBufferData(uint32_t *bufferData)
    {
        if(bufferData && outputArray_ && outputArraySize_ > 0){
            memset(outputArray_.get(), 0, outputArraySize_ * sizeof(uint32_t));
            memcpy(outputArray_.get(), bufferData, outputArraySize_ * sizeof(uint32_t));
        }
    }

    void setRotation(uint32_t rotation){
        rotation_ = rotation;
    }

    int getRotation(){
        return rotation_;
    }
    
private:
    std::unique_ptr<uint32_t[]> inputArray_;
    std::unique_ptr<uint8_t[]> inputAugmentedArray_;
    std::unique_ptr<uint32_t[]> outputArray_;
    
    uint32_t inputArraySize_;
    uint32_t inputAugmentedArraySize_;
    uint32_t outputArraySize_;
    int rotation_;
    
    bool newBufferDataAvailable_;  
};

unityBridgePtr unityBridge::instance_ = std::make_shared<unityBridge>();

extern "C"{

    void __stdcall initInputBuffersCS(uint32_t rgb_size, uint32_t augmented_size){
        unityBridge::getBridge()->initInputBuffer(rgb_size, augmented_size);
    }

    void __stdcall initOutputBufferCS(uint32_t size){
        unityBridge::getBridge()->initOutputBuffer(size);
    }

    void __stdcall getInputBufferCS(uint32_t* outBuffer, uint8_t* outAugmentedBuffer){
        unityBridge::getBridge()->copyInputArray(outBuffer, outAugmentedBuffer);
        unityBridge::getBridge()->setNewBufferDataAvailable(false);
    }

    int __stdcall getRotationCS(){
        return unityBridge::getBridge()->getRotation();
    }

    void __stdcall setOutputBufferDataCS(uint32_t* bufferData){
        unityBridge::getBridge()->setOutputBufferData(bufferData);
    }

    bool __stdcall isNewBufferDataAvailable()
    {
        return unityBridge::getBridge()->isNewBufferDataAvailable();
    }
}

@implementation FrameworkLibAPI

+ (void) getOutputBufferCpp:(std::unique_ptr<uint32_t[]>&)buffer size:(uint32_t&)size
{
    buffer = nullptr;
    size = 0;
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return;
    
    return bridge->getOutput(buffer, size);
}

+ (void) setInputBufferCpp:(uint32_t*)buffer rgbSize:(uint32_t)rgb_size augmentedBuffer:(uint8_t*)augmentedBuffer augmentedSize:(uint32_t)augmented_size rotation:(int)rotation
{
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return;
    
    bridge->setInputBufferData(buffer, rgb_size);
    bridge->setInputAugmentedBufferData(augmentedBuffer, augmented_size);
    bridge->setRotation(rotation);
    bridge->setNewBufferDataAvailable(true);
}

@end

