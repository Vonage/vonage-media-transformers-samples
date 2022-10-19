//
//  rtc_engine.h
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-17.
//

#ifndef RTC_ENGINE_H_
#define RTC_ENGINE_H_

#include <string>

#include <api/peer_connection_interface.h>

// Media processor library does not support UWP yet.
#ifndef UWP_TEST
// Uncomment out line below in order to include MediaProcessor bits.
#define VCP_MEDIA_PROCESSOR 1
// TFLite ML transformers library not supported for Debian (yet).
// See https://jira.vonage.com/browse/OW-312
#ifndef DEBIAN_TEST
// Uncomment out line below in order to include TFLite MLTransformers bits.
// Note TFLite MLTransformers bits depend on MediaProcessor ones so
// VCP_MEDIA_PROCESSOR macro has to be defined too when using
// TFLite MLTransformers bits.
//#define VCP_TFLITE_ML_TRANSFORMERS 1
#endif
#endif

namespace vonage {

#ifdef VCP_MEDIA_PROCESSOR
class AudioProcessor;
class VideoProcessor;
#endif

class RTCAudioTrackSink;

class RTCEngineObserver {
public:
    virtual void OnOffer(const std::string& sdp) = 0;
    virtual void OnAnswer(const std::string& sdp) = 0;
    virtual void OnCandidate(const std::string& mid, const int mline_index, const std::string& icecandidate) = 0;
    virtual void OnIceGatheringChangeComplete(const std::string& sdp) = 0;
    virtual void OnStartVideoCapture(rtc::Thread* signaling_thread, rtc::Thread* worker_thread) = 0;
};

class RTCEngine : public webrtc::PeerConnectionObserver,
                  public webrtc::CreateSessionDescriptionObserver {
public:
    RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
              bool loopback,
              const std::string& audio_input_file,
              const std::string& audio_output_file,
              const std::string& video_input_file,
              const std::string& video_output_file);
    RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
              bool loopback,
              const std::string& audio_input_file,
              const std::string& audio_output_file,
              const std::string& video_input_file,
              const std::string& video_output_file,
              std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink);
    RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
              bool loopback,
              const std::string& audio_input_file,
              const std::string& audio_output_file,
              const std::string& video_input_file,
              const std::string& video_output_file,
              rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
              RTCEngineObserver* observer);
    RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
              bool loopback,
              const std::string& audio_input_file,
              const std::string& audio_output_file,
              const std::string& video_input_file,
              const std::string& video_output_file,
              rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
              RTCEngineObserver* observer,
              std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink);
    RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
              bool loopback,
              const std::string& audio_input_file,
              const std::string& audio_output_file,
              const std::string& video_input_file,
              const std::string& video_output_file,
              rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
              RTCEngineObserver* observer,
              std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink,
              const std::string& ml_model_file_path);
    ~RTCEngine();

    void OverrideAudioOutputFile(const std::string& audio_output_file);
    void CreateOffer();
    void SetLocalDescription(const webrtc::SdpType& type, const std::string& sdp);
    void CreateAnswer();
    void SetRemoteDescription(const webrtc::SdpType& type, const std::string& sdp);
    void SetCandidate(const std::string& mid, const int mline_index, const std::string& icecandidate);
    void RegisterObserver(RTCEngineObserver* observer);
    bool trickle_ice();
    void GetStats();
    void SetVideoTrackSource(rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source);
    void SetRemoteVideoSink(std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink);
    void SetPreferredVideoCodecs(const std::vector<std::string> codecs);
    void EnableMediaProccesorTest();
    void Shutdown();

protected:
    bool EnsurePeerConnectionFactory();
    bool CreatePeerConnection();
    void DeletePeerConnection();
    void AddTracks();

    // https://w3c.github.io/webrtc-pc/#dom-rtcsignalingstate
    inline constexpr absl::string_view AsString(webrtc::PeerConnectionInterface::SignalingState state) {
        switch (state) {
            case webrtc::PeerConnectionInterface::SignalingState::kStable:
                return "stable";
            case webrtc::PeerConnectionInterface::SignalingState::kHaveLocalOffer:
                return "have-local-offer";
            case webrtc::PeerConnectionInterface::SignalingState::kHaveLocalPrAnswer:
                return "have-local-pranswer";
            case webrtc::PeerConnectionInterface::SignalingState::kHaveRemoteOffer:
                return "have-remote-offer";
            case webrtc::PeerConnectionInterface::SignalingState::kHaveRemotePrAnswer:
                return "have-remote-pranswer";
            case webrtc::PeerConnectionInterface::SignalingState::kClosed:
                return "closed";
        }
        return "";
    }

    // https://w3c.github.io/webrtc-pc/#dom-rtcicegatheringstate
    inline constexpr absl::string_view AsString(webrtc::PeerConnectionInterface::IceGatheringState state) {
        switch (state) {
            case webrtc::PeerConnectionInterface::IceGatheringState::kIceGatheringNew:
                return "new";
            case webrtc::PeerConnectionInterface::IceGatheringState::kIceGatheringGathering:
                return "gathering";
            case webrtc::PeerConnectionInterface::IceGatheringState::kIceGatheringComplete:
                return "complete";
        }
        return "";
    }

    // https://w3c.github.io/webrtc-pc/#dom-rtciceconnectionstate
    inline constexpr absl::string_view AsString(webrtc::PeerConnectionInterface::PeerConnectionState state) {
        switch (state) {
            case webrtc::PeerConnectionInterface::PeerConnectionState::kNew:
                return "new";
            case webrtc::PeerConnectionInterface::PeerConnectionState::kConnecting:
                return "connecting";
            case webrtc::PeerConnectionInterface::PeerConnectionState::kConnected:
                return "connected";
            case webrtc::PeerConnectionInterface::PeerConnectionState::kDisconnected:
                return "disconnected";
            case webrtc::PeerConnectionInterface::PeerConnectionState::kFailed:
                return "failed";
            case webrtc::PeerConnectionInterface::PeerConnectionState::kClosed:
                return "closed";
        }
        return "";
    }

    inline constexpr absl::string_view AsString(webrtc::PeerConnectionInterface::IceConnectionState state) {
        switch (state) {
            case webrtc::PeerConnectionInterface::kIceConnectionNew:
                return "new";
            case webrtc::PeerConnectionInterface::kIceConnectionChecking:
                return "checking";
            case webrtc::PeerConnectionInterface::kIceConnectionConnected:
                return "connected";
            case webrtc::PeerConnectionInterface::kIceConnectionCompleted:
                return "completed";
            case webrtc::PeerConnectionInterface::kIceConnectionFailed:
                return "failed";
            case webrtc::PeerConnectionInterface::kIceConnectionDisconnected:
                return "disconnected";
            case webrtc::PeerConnectionInterface::kIceConnectionClosed:
                return "closed";
            case webrtc::PeerConnectionInterface::kIceConnectionMax:
                return "";
        }
        return "";
    }

    // PeerConnectionObserver implementation.
    void OnSignalingChange(webrtc::PeerConnectionInterface::SignalingState new_state) override;
    void OnAddTrack(rtc::scoped_refptr<webrtc::RtpReceiverInterface> receiver,
    const std::vector<rtc::scoped_refptr<webrtc::MediaStreamInterface>>& streams) override;
    void OnRemoveTrack(rtc::scoped_refptr<webrtc::RtpReceiverInterface> receiver) override;
    void OnDataChannel(rtc::scoped_refptr<webrtc::DataChannelInterface> channel) override;
    void OnRenegotiationNeeded() override;
    void OnIceConnectionChange(webrtc::PeerConnectionInterface::IceConnectionState new_state) override;
    void OnIceGatheringChange(webrtc::PeerConnectionInterface::IceGatheringState new_state) override;
    void OnIceCandidate(const webrtc::IceCandidateInterface* candidate) override;
    void OnIceConnectionReceivingChange(bool receiving) override;

    // CreateSessionDescriptionObserver implementation.
    void OnSuccess(webrtc::SessionDescriptionInterface* desc) override;
    void OnFailure(webrtc::RTCError error) override;

    RTCEngineObserver* observer_;
    webrtc::PeerConnectionInterface::IceServers servers_;
    std::unique_ptr<rtc::Thread> network_thread_;
    std::unique_ptr<rtc::Thread> worker_thread_;
    std::unique_ptr<rtc::Thread> signaling_thread_;
    std::unique_ptr<webrtc::TaskQueueFactory> task_queue_factory_;
    rtc::scoped_refptr<webrtc::PeerConnectionFactoryInterface> peer_connection_factory_;
    rtc::scoped_refptr<webrtc::PeerConnectionInterface> peer_connection_;
    rtc::scoped_refptr<webrtc::AudioDeviceModule> adm_;
    rtc::scoped_refptr<webrtc::AudioProcessing> audio_processing_;
    //std::unique_ptr<RTCAudioTrackSink> audio_track_sink_;
    std::string audio_input_file_;
    std::string audio_output_file_;
    std::string video_input_file_;
    std::string video_output_file_;
    bool loopback_ = false;
    bool trickle_ice_ = true;
    rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source_;
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink_;
#ifdef VCP_MEDIA_PROCESSOR
    std::unique_ptr<vonage::VideoProcessor> video_processor_;
    std::vector<std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::VideoFrame>>> video_transformers_;
    std::unique_ptr<vonage::AudioProcessor> audio_processor_;
    std::vector<std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::AudioFrame>>> audio_transformers_;
#endif
    std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink_;
    std::string ml_model_file_path_;
    std::vector<webrtc::SdpVideoFormat> video_codecs_;
    bool enable_media_processor_test_ = false;
};

}
#endif  // RTC_ENGINE_H_
