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
    
    uint32_t* getInput(){
        if(inputArraySize_ == 0) return nullptr;
        
        if(inputArray_ != nullptr){
            return inputArray_.get();
        }
        
        return nullptr;
    }

    uint32_t* getOutput(){
        if(outputArraySize_ == 0) return nullptr;
        
        if(outputArray_ != nullptr){
            return outputArray_.get();
        }
        
        return nullptr;
    }

    bool isNewBufferDataAvailable()
    {
        return newBufferDataAvailable_;
    }

    void setNewBufferDataAvailable(bool value)
    {
        newBufferDataAvailable_ = value;
    }
    
    void initInputBuffer(uint32_t size){
        inputArraySize_ = size;
        inputArray_ = std::unique_ptr<uint32_t>(new uint32_t[size]);
        memset(inputArray_.get(), 0, size * sizeof(uint32_t));
    }

    void initOutputBuffer(uint32_t size){
        outputArraySize_ = size;
        outputArray_ = std::unique_ptr<uint32_t>(new uint32_t[size]);
        memset(outputArray_.get(), 0, size * sizeof(uint32_t));
    }

    void copyInputArray(uint32_t *outArray)
    {
        if(inputArray_ == nullptr) return;
        
        memcpy(outArray, unityBridge::getBridge()->getInput(), inputArraySize_ * sizeof(uint32_t));
    }

    void setInputBufferData(uint32_t *bufferData)
    {
        auto input = unityBridge::getBridge()->getInput();

        if(input == nullptr) return;

        memcpy(input, bufferData, inputArraySize_ * sizeof(uint32_t));
    }

    void setOutputBufferData(uint32_t *bufferData)
    {
        auto output = unityBridge::getBridge()->getOutput();

        if(output == nullptr) return;

        memcpy(output, bufferData, outputArraySize_ * sizeof(uint32_t));
    }

    void setRotation(uint32_t rotation){
        rotation_ = rotation;
    }

    int getRotation(){
        return rotation_;
    }
    
private:
    std::unique_ptr<uint32_t> inputArray_;
    std::unique_ptr<uint32_t> outputArray_;
    
    uint32_t inputArraySize_;
    uint32_t outputArraySize_;
    int rotation_;
    
    bool newBufferDataAvailable_;
    
};

unityBridgePtr unityBridge::instance_ = std::make_shared<unityBridge>();

extern "C"{

    void __stdcall initInputBufferCS(uint32_t size){
        unityBridge::getBridge()->initInputBuffer(size);
    }

        void __stdcall initOutputBufferCS(uint32_t size){
        unityBridge::getBridge()->initOutputBuffer(size);
    }

    void __stdcall getInputBufferCS(uint32_t* outBuffer){
        unityBridge::getBridge()->copyInputArray(outBuffer);
        unityBridge::getBridge()->setNewBufferDataAvailable(false);
    }

    int __stdcall getRotationCS(){
        return unityBridge::getBridge()->getRotation();
    }

    void __stdcall setInputBufferDataCS(uint32_t* bufferData){
        unityBridge::getBridge()->setInputBufferData(bufferData);
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

+ (uint32_t*) getInputBufferCpp
{
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return nullptr;
    
    return bridge->getInput();
}

+ (uint32_t*) getOutputBufferCpp
{
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return nullptr;
    
    return bridge->getOutput();
}

+ (void) setInputBufferCpp:(uint32_t*) buffer andRotation:(int)rotation
{
    auto bridge = unityBridge::getBridge();
    
    if(bridge == nullptr) return;
    
    bridge->setInputBufferData(buffer);
    bridge->setRotation(rotation);
    bridge->setNewBufferDataAvailable(true);
}

@end

