#import <Foundation/Foundation.h>
#import "NativeCallProxy.h"


#include <memory>

#define EXPORT __attribute__((visibility("default")))

class someBridge;
typedef std::shared_ptr<someBridge> someBridgePrt;


class someBridge {
public:
    static someBridgePrt instance_;
    static someBridgePrt getBridge(){
        return instance_;
    }
    someBridge(){
        inputArray_ = nullptr;
        outputArray_ = nullptr;
        inputArraySize_ = 0;
        outputArraySize_ = 0;
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
        
        memcpy(outArray, someBridge::getBridge()->getInput(), inputArraySize_ * sizeof(uint32_t));
    }

    void setInputBufferData(uint32_t *bufferData)
    {
        auto input = someBridge::getBridge()->getInput();

        if(input == nullptr) return;

        memcpy(input, bufferData, inputArraySize_ * sizeof(uint32_t));
    }

    void setOutputBufferData(uint32_t *bufferData)
    {
        auto output = someBridge::getBridge()->getOutput();

        if(output == nullptr) return;

        memcpy(output, bufferData, outputArraySize_ * sizeof(uint32_t));
    }
    
private:
    std::unique_ptr<uint32_t> inputArray_;
    std::unique_ptr<uint32_t> outputArray_;
    
    uint32_t inputArraySize_;
    uint32_t outputArraySize_;
    
    bool newBufferDataAvailable_;
    
};

someBridgePrt someBridge::instance_ = std::make_shared<someBridge>();

extern "C"{

    void __stdcall initInputBufferCS(uint32_t size){
        someBridge::getBridge()->initInputBuffer(size);
    }

        void __stdcall initOutputBufferCS(uint32_t size){
        someBridge::getBridge()->initOutputBuffer(size);
    }

    void __stdcall getInputBufferCS(uint32_t* outBuffer){
        someBridge::getBridge()->copyInputArray(outBuffer);
        someBridge::getBridge()->setNewBufferDataAvailable(false);
    }

    void __stdcall setInputBufferDataCS(uint32_t* bufferData){
        someBridge::getBridge()->setInputBufferData(bufferData);
    }

    void __stdcall setOutputBufferDataCS(uint32_t* bufferData){
        someBridge::getBridge()->setOutputBufferData(bufferData);
    }

    bool __stdcall isNewBufferDataAvailable()
    {
        return someBridge::getBridge()->isNewBufferDataAvailable();
    }

//    EXPORT uint32_t* getInputBufferCpp(){
//        return someBridge::getBridge()->getInput();
//    }
}

@implementation FrameworkLibAPI

id<NativeCallsProtocol> api = NULL;
+(void) registerAPIforNativeCalls:(id<NativeCallsProtocol>) aApi
{
    api = aApi;
}

+ (uint32_t*) getInputBufferCpp
{
    auto bridge = someBridge::getBridge();
    
    if(bridge == nullptr) return nullptr;
    
    return bridge->getInput();
}

+ (uint32_t*) getOutputBufferCpp
{
    auto bridge = someBridge::getBridge();
    
    if(bridge == nullptr) return nullptr;
    
    return bridge->getOutput();
}

+ (void) setInputBufferCpp: (uint32_t*) buffer
{
    auto bridge = someBridge::getBridge();
    
    if(bridge == nullptr) return;
    
    bridge->setInputBufferData(buffer);
    bridge->setNewBufferDataAvailable(true);
}

@end


extern "C" {
    void showHostMainWindow(const char* color) { return [api showHostMainWindow:[NSString stringWithUTF8String:color]]; }
}

