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
namespace vonage {
class VideoProcessor;
}

class TransformerObserver;
class CreateSessionDescriptionObserverImpl;
class SetSessionDescriptionObserverImpl;
class RTCLogTrace;

class WebRTCHelperObserver{
public:
    virtual void OnStats(const std::string& stats) = 0;
};

class WebRTCHelper : public webrtc::PeerConnectionObserver, public webrtc::RTCStatsCollectorCallback {
public:
    friend class CreateSessionDescriptionObserverImpl;
    
    WebRTCHelper(WebRTCHelperObserver* observer);
    virtual ~WebRTCHelper();
    
    bool init(rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
              std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink,
              std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink,
              std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::VideoFrame>> transformer,
              bool support_augmented_data);
    
    rtc::Thread* getWorkerThread();
    rtc::Thread* getNetworkThread();
    rtc::Thread* getSignalingThread();
    
    void requestStats();
    
private:
    void CreateOffer();
    void SetLocalDescription(const webrtc::SdpType& type, const std::string& sdp);
    void SetRemoteDescription(const webrtc::SdpType& type, const std::string& sdp);
    void AddTracks();
    void OnSuccess(webrtc::SessionDescriptionInterface* desc);
    
    // PeerConnectionObserver.
    void OnSignalingChange(webrtc::PeerConnectionInterface::SignalingState new_state) override;
    void OnAddTrack(rtc::scoped_refptr<webrtc::RtpReceiverInterface> receiver, const std::vector<rtc::scoped_refptr<webrtc::MediaStreamInterface>>& streams) override;
    void OnDataChannel(rtc::scoped_refptr<webrtc::DataChannelInterface> channel) override;
    void OnIceCandidate(const webrtc::IceCandidateInterface* candidate) override;
    void OnIceGatheringChange(webrtc::PeerConnectionInterface::IceGatheringState new_state) override;
    
    //RTCStatsCollectorCallback.
    void OnStatsDelivered(const rtc::scoped_refptr<const webrtc::RTCStatsReport>& report) override;
private:
    std::unique_ptr<rtc::Thread> _worker;
    std::unique_ptr<rtc::Thread> _network;
    std::unique_ptr<rtc::Thread> _signal;
    
    rtc::scoped_refptr<webrtc::PeerConnectionFactoryInterface> _factory;
    rtc::scoped_refptr<webrtc::PeerConnectionInterface> _peer_connection;
    rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> _video_source;
    rtc::scoped_refptr<webrtc::VideoTrackInterface> _video_track;
    rtc::scoped_refptr<webrtc::AudioTrackInterface> _audio_track;

    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> _local_sink;
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> _remote_sink;
    
    std::vector<std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::VideoFrame>>> _video_transformers;
    std::unique_ptr<vonage::VideoProcessor> _video_processor;
    rtc::scoped_refptr<CreateSessionDescriptionObserverImpl> _create_session_description_observer;
    rtc::scoped_refptr<SetSessionDescriptionObserverImpl> _set_session_description_observer;
    std::unique_ptr<RTCLogTrace> _logger;
    WebRTCHelperObserver* _observer;
};
#endif
