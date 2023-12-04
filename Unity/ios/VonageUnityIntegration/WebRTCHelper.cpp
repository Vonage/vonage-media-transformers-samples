//
//  WebRTCHelper.cpp
//  iOSObjCApp
//
//  Created by Guy Mininberg on 18/10/2022.
//

#include "WebRTCHelper.hpp"
#include <api/audio_codecs/builtin_audio_decoder_factory.h>
#include <api/audio_codecs/builtin_audio_encoder_factory.h>
#include <api/video_codecs/builtin_video_decoder_factory.h>
#include <api/video_codecs/builtin_video_encoder_factory.h>
#include <media/engine/multiplex_codec_factory.h>
#include <api/create_peerconnection_factory.h>
#include <api/task_queue/default_task_queue_factory.h>
#include <modules/vonage/api/media_processor/media_processor.h>
#include <rtc_base/logging.h>
#include <api/jsep_ice_candidate.h>
#include <pc/channel_manager.h>
#include "transformers.h"

class RTCLogTrace : public rtc::LogSink
{
public:
    RTCLogTrace() = default;
    virtual ~RTCLogTrace() = default;
    
    virtual void OnLogMessage(const std::string& message,
                              rtc::LoggingSeverity severity,
                              const char* tag){
        printf("[%s] %s\r\n", tag, message.c_str());
    }
    virtual void OnLogMessage(const std::string& message){
        printf("%s\r\n", message.c_str());
    }
    
private:
    std::string GetSeverity(rtc::LoggingSeverity severity);
};

class CreateSessionDescriptionObserverImpl : public webrtc::CreateSessionDescriptionObserver{
public:
    CreateSessionDescriptionObserverImpl(WebRTCHelper* helper) : _helper(helper){};
    virtual ~CreateSessionDescriptionObserverImpl() = default;
    void OnSuccess(webrtc::SessionDescriptionInterface* desc) override {
        _helper->OnSuccess(desc);
    }
    void OnFailure(webrtc::RTCError error) override{
        RTC_LOG_T_F(LS_ERROR) << error.message();
    }
private:
    WebRTCHelper* _helper;
};

class SetSessionDescriptionObserverImpl : public webrtc::SetSessionDescriptionObserver{
public:
    SetSessionDescriptionObserverImpl() = default;
    virtual ~SetSessionDescriptionObserverImpl() = default;
    void OnSuccess() override {
    }
    void OnFailure(webrtc::RTCError error) override {
        RTC_LOG_T_F(LS_ERROR) << error.message();
    }
};

WebRTCHelper::WebRTCHelper(){
    RTC_LOG(LS_VERBOSE) << "WebRTCHelper";
    _worker = rtc::Thread::Create();
    _worker->SetName("worker_thread", nullptr);
    _worker->Start();
    _signal = rtc::Thread::Create();
    _signal->SetName("singal_thread", nullptr);
    _signal->Start();
    _network = rtc::Thread::CreateWithSocketServer();
    _network->SetName("network_thread", nullptr);
    _network->Start();
}

WebRTCHelper::~WebRTCHelper(){
    RTC_LOG(LS_VERBOSE) << "~WebRTCHelper";
    _video_transformers.clear();
    _video_processor = nullptr;
    
    if(_peer_connection){
        _peer_connection->Close();
        _peer_connection->Release();
        _peer_connection.release();
        _peer_connection = nullptr;
    }
    
    if(_video_track){
        _video_track->Release();
        _video_track.release();
        _video_track = nullptr;
    }
    
    if(_audio_track){
        _audio_track->Release();
        _audio_track.release();
        _audio_track = nullptr;
    }
 
    if(_factory){
        _factory->Release();
        _factory.release();
        _factory = nullptr;
    }
    _worker->Stop();
    _signal->Invoke<void>(RTC_FROM_HERE, [&](){
        _create_session_description_observer = nullptr;
        _set_session_description_observer = nullptr;
    });
    _signal->Stop();
    _network->Stop();
}

bool WebRTCHelper::init(rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
                        std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink,
                        std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink,
                        std::shared_ptr<webrtc::BaseFrameTransformer<webrtc::VideoFrame>> transformer,
                        bool support_augmented_data){
    
    _logger = std::make_unique<RTCLogTrace>();
    rtc::LogMessage::AddLogToStream(_logger.get(), rtc::LS_VERBOSE);
    
    _local_sink = std::move(local_sink);
    _remote_sink = std::move(remote_sink);
    _video_source = video_source;
    std::unique_ptr<webrtc::MultiplexEncoderFactory> multiplex_encoder = std::make_unique<webrtc::MultiplexEncoderFactory>(webrtc::CreateBuiltinVideoEncoderFactory(), support_augmented_data);
    std::unique_ptr<webrtc::MultiplexDecoderFactory> multiplex_decoder = std::make_unique<webrtc::MultiplexDecoderFactory>(webrtc::CreateBuiltinVideoDecoderFactory(), support_augmented_data);
    
    _factory = webrtc::CreatePeerConnectionFactory(_network.get(),
                                                   _worker.get(),
                                                   _signal.get(),
                                                   nullptr,
                                                   webrtc::CreateBuiltinAudioEncoderFactory(),
                                                   webrtc::CreateBuiltinAudioDecoderFactory(),
                                                   std::move(multiplex_encoder),
                                                   std::move(multiplex_decoder),
                                                   nullptr,
                                                   nullptr);
    
    _video_processor = std::make_unique<vonage::VideoProcessor>();
    _video_transformers.push_back(transformer);
    _video_processor->SetTransformers(_video_transformers);
    
    _signal->Invoke<void>(RTC_FROM_HERE, [&](){
        _create_session_description_observer = new rtc::RefCountedObject<CreateSessionDescriptionObserverImpl>(this);
        _set_session_description_observer = new rtc::RefCountedObject<SetSessionDescriptionObserverImpl>();
    });
    
    webrtc::PeerConnectionInterface::RTCConfiguration config;
    config.sdp_semantics = webrtc::SdpSemantics::kUnifiedPlan;
    
    webrtc::PeerConnectionInterface::IceServers servers;
    {
        webrtc::PeerConnectionInterface::IceServer server;
        server.uri = "stun:stun.l.google.com:19302";
        servers.push_back(server);
    }
    
    config.servers = servers;
    config.enable_dtls_srtp = false;
    
    webrtc::PeerConnectionDependencies pc_dependencies(this);
    auto error_or_peer_connection = _factory->CreatePeerConnectionOrError(config, std::move(pc_dependencies));
    if (error_or_peer_connection.ok()) {
        _peer_connection = std::move(error_or_peer_connection.value());
        AddTracks();
    }
    
    CreateOffer();
    
    return true;
}

rtc::Thread* WebRTCHelper::getWorkerThread(){
    return _worker.get();
}

rtc::Thread* WebRTCHelper::getNetworkThread(){
    return _network.get();
}

rtc::Thread* WebRTCHelper::getSignalingThread(){
    return _signal.get();
}

void WebRTCHelper::CreateOffer() {
    if (!_factory || !_peer_connection) {
        return;
    }
    
    webrtc::PeerConnectionInterface::RTCOfferAnswerOptions options;
    _peer_connection->CreateOffer(_create_session_description_observer.get(), options);
}

void WebRTCHelper::AddTracks() {
    cricket::AudioOptions audio_options;
    _audio_track = _factory->CreateAudioTrack("audio_test", _factory->CreateAudioSource(audio_options));
    
    auto result_or_error = _peer_connection->AddTrack(_audio_track, {"stream_id"});
    if (!result_or_error.ok()) {
        RTC_LOG_T_F(LS_ERROR) << "Failed to add audio track to PeerConnection: "
        << result_or_error.error().message();
    }
    
    
    if (_video_source.get() != nullptr) {
        _video_track = _factory->CreateVideoTrack("video_test", _video_source);
        result_or_error = _peer_connection->AddTrack(_video_track, {"stream_id"});
        if (!result_or_error.ok()) {
            RTC_LOG_T_F(LS_ERROR) << "Failed to add video track to PeerConnection: "
            << result_or_error.error().message();
        }
        if (_local_sink.get() != nullptr) {
            _video_track->AddOrUpdateSink(_local_sink.get(), rtc::VideoSinkWants());
        }
    }
}

void WebRTCHelper::SetLocalDescription(const webrtc::SdpType& type, const std::string& sdp) {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!_factory || !_peer_connection) {
        return;
    }
    webrtc::SdpParseError error;
    std::unique_ptr<webrtc::SessionDescriptionInterface> description =
    webrtc::CreateSessionDescription(type, sdp, &error);
    if (description.get() == nullptr) {
        RTC_LOG(LS_WARNING) << "Can't parse session description. "
        "SdpParseError was: "
        << error.description;
        return;
    }
    _peer_connection->SetLocalDescription(_set_session_description_observer.get(), description.release());
}

void WebRTCHelper::SetRemoteDescription(const webrtc::SdpType& type, const std::string& sdp) {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!_factory || !_peer_connection) {
        return;
    }
    webrtc::SdpParseError error;
    std::unique_ptr<webrtc::SessionDescriptionInterface> description =
    webrtc::CreateSessionDescription(type, sdp, &error);
    if (description.get() == nullptr) {
        RTC_LOG(LS_WARNING) << "Can't parse session description. "
        "SdpParseError was: "
        << error.description;
        return;
    }
    _peer_connection->SetRemoteDescription(_set_session_description_observer.get(), description.release());
}

// PeerConnectionObserver implementation.
void WebRTCHelper::OnSignalingChange(webrtc::PeerConnectionInterface::SignalingState new_state) {
}

void WebRTCHelper::OnAddTrack(rtc::scoped_refptr<webrtc::RtpReceiverInterface> receiver,
                              const std::vector<rtc::scoped_refptr<webrtc::MediaStreamInterface>>& streams) {
    auto track = receiver->track();
    if (track->kind() == webrtc::MediaStreamTrackInterface::kVideoKind) {
        if (_remote_sink.get() != nullptr) {
            for (auto stream : streams) {
                webrtc::VideoTrackVector tracks = stream->GetVideoTracks();
                for (auto track : tracks) {
                    if (_video_processor->SetTrack(track) == false) {
                        RTC_LOG_T_F(LS_WARNING) << "Video processor set track method failed";
                    }
                    track->AddOrUpdateSink(_remote_sink.get(), rtc::VideoSinkWants());
                }
            }
        }
    }
}

void WebRTCHelper::OnDataChannel(rtc::scoped_refptr<webrtc::DataChannelInterface> channel) {
}

void WebRTCHelper::OnIceCandidate(const webrtc::IceCandidateInterface* candidate) {
    if (candidate) {
        const webrtc::JsepIceCandidate* in_candidate = static_cast<const webrtc::JsepIceCandidate*>(candidate);
        std::unique_ptr<webrtc::JsepIceCandidate> loopback_candidate = std::make_unique<webrtc::JsepIceCandidate>(in_candidate->sdp_mid(), in_candidate->sdp_mline_index(), in_candidate->candidate());
        cricket::Candidate new_candidate(loopback_candidate->candidate());
        new_candidate.set_id(rtc::CreateRandomString(8));
        loopback_candidate->SetCandidate(new_candidate);
        if (!_peer_connection->AddIceCandidate(loopback_candidate.get())) {
            RTC_LOG_T_F(LS_ERROR) << "Failed to apply the received candidate";
        }
        return;
    }
}

void WebRTCHelper::OnIceGatheringChange(webrtc::PeerConnectionInterface::IceGatheringState new_state) {
    RTC_LOG_T_F(LS_VERBOSE) << new_state;
}

void WebRTCHelper::OnSuccess(webrtc::SessionDescriptionInterface* desc) {
    if (desc == nullptr) {
        return;
    }
    std::string sdp;
    desc->ToString(&sdp);
    RTC_LOG_T_F(LS_VERBOSE) << sdp;
    switch (desc->GetType()) {
        case webrtc::SdpType::kOffer:
            SetLocalDescription(webrtc::SdpType::kOffer, sdp);
            SetRemoteDescription(webrtc::SdpType::kAnswer, sdp);
            return;
        default:
            break;
    }
}
