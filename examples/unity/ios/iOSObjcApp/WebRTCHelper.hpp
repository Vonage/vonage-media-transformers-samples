//
//  WebRTCHelper.hpp
//  iOSObjCApp
//
//  Created by Guy Mininberg on 18/10/2022.
//

#ifndef WEBRTC_HELPER_H_
#define WEBRTC_HELPER_H_
#include <api/peer_connection_interface.h>


namespace webrtc {
class PeerConnectionFactoryInterface;
}
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
};
#endif
