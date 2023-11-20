//
//  WebRTCHelper.hpp
//  iOSObjCApp
//
//  Created by Guy Mininberg on 18/10/2022.
//

#ifndef WEBRTC_HELPER_H_
#define WEBRTC_HELPER_H_
#include <api/peer_connection_interface.h>
#include <modules/vonage/api/crypto/sframe/vonage_sframe_observer.h>

namespace webrtc {
class PeerConnectionFactoryInterface;
}

class TransformerObserver : public webrtc::BaseFrameTransformerObserver {
public:
    TransformerObserver();
    virtual ~TransformerObserver();
    
    // BaseFrameTransformerObsever implementation.
    void OnWarning(webrtc::MediaProcessorWarningCode code, const std::string& message) override;
    void OnError(webrtc::MediaProcessorErrorCode code, const std::string& message) override;
};

class WebRTCHelper{
public:
    WebRTCHelper();
    virtual ~WebRTCHelper();
    
    bool init(webrtc::VideoTrackSourceInterface* videoSource, std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink);
    
    rtc::Thread* getWorkerThread();
    rtc::Thread* getNetworkThread();
    rtc::Thread* getSignalingThread();
    
private:
    std::unique_ptr<rtc::Thread> _worker;
    std::unique_ptr<rtc::Thread> _network;
    std::unique_ptr<rtc::Thread> _signal;
    
    rtc::scoped_refptr<webrtc::PeerConnectionFactoryInterface> _factory;
    rtc::scoped_refptr<webrtc::VideoTrackInterface> _video_track;
    
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> _local_sink;
    
    std::vector<std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::VideoFrame>>> _video_transformers;
    std::unique_ptr<TransformerObserver> _transformer_observer;
};
#endif
