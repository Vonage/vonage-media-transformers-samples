//
//  rtc_engine.cpp
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-17.
//

#include "rtc_engine.h"
//#include "rtc_audio_sink.h"
//#include "rtc_audio_processing_impl.h"
#include <string>

#include "api/audio_codecs/audio_decoder_factory.h"
#include "api/audio_codecs/audio_encoder_factory.h"
#include "api/audio_codecs/builtin_audio_decoder_factory.h"
#include "api/audio_codecs/builtin_audio_encoder_factory.h"
#include "api/create_peerconnection_factory.h"
#include "api/video_codecs/builtin_video_decoder_factory.h"
#include "api/video_codecs/builtin_video_encoder_factory.h"
#include "api/video_codecs/video_decoder_factory.h"
#include "api/video_codecs/video_encoder_factory.h"
#include "modules/video_capture/video_capture.h"
#include "modules/video_capture/video_capture_factory.h"
#include "pc/video_track_source.h"
#include "rtc_base/logging.h"
#include <api/task_queue/default_task_queue_factory.h>
#include <modules/audio_device/dummy/file_audio_device_factory.h>
#include <system_wrappers/include/field_trial.h>

//#include "rtc/rtc_video_encoding_decoding_engine.h"

#ifdef VCP_MEDIA_PROCESSOR
#include <media_processor/media_processor.h>
//#include "transformers/transformers.h"
#ifdef VCP_TFLITE_ML_TRANSFORMERS
#include <ml_transformers/ml_transformers.h>
#endif // VCP_TFLITE_ML_TRANSFORMERS
#endif // VCP_MEDIA_PROCESSOR

// Note: Comment out line below to keep using legacy TLS protocol versions.
#define DISABLE_LEGACY_TLS_PROTOCOL_VERSIONS 1
// Note: Uncomment out macro below in case overriding crypto suites with a custom set (and order) of them.
//#define OVERRIDE_DTLS_SRTP_GCM_CRYPTO_SUITES 1
// Note: Force GCM crypto suites for DTLS-SRTP. Uncomment line below to not force them.
#define DTLS_SRTP_GCM_CRYPTO_SUITES 1

namespace vonage {

const char kAudioLabel[] = "audio_label";
const char kVideoLabel[] = "video_label";
const char kStreamId[] = "stream_id";

class DummyRTCStatsCollectorCallback : public webrtc::RTCStatsCollectorCallback {
public:
    static DummyRTCStatsCollectorCallback* Create () {
        return new rtc::RefCountedObject<DummyRTCStatsCollectorCallback>();
    }
    void OnStatsDelivered(const rtc::scoped_refptr<const webrtc::RTCStatsReport>& report) override {
        RTC_LOG_T_F(LS_VERBOSE) << report->ToJson();
    }
};

class DummySetSessionDescriptionObserver : public webrtc::SetSessionDescriptionObserver {
public:
    static DummySetSessionDescriptionObserver* Create() {
        return new rtc::RefCountedObject<DummySetSessionDescriptionObserver>();
    }

    virtual void OnSuccess() {
        RTC_LOG_T_F(LS_VERBOSE);
    }

    virtual void OnFailure(webrtc::RTCError error) {
        RTC_LOG_T_F(LS_VERBOSE) " " << ToString(error.type()) << ": " << error.message();
    }
};

// RTCEngine

RTCEngine::RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
                     bool loopback,
                     const std::string& audio_input_file,
                     const std::string& audio_output_file,
                     const std::string& video_input_file,
                     const std::string& video_output_file) :
servers_(servers),
loopback_(loopback),
trickle_ice_(true),
audio_input_file_(audio_input_file),
audio_output_file_(audio_output_file),
video_input_file_(video_input_file),
video_output_file_(video_output_file)
{
    RTC_LOG_T_F(LS_VERBOSE);

    network_thread_ = rtc::Thread::CreateWithSocketServer();
    network_thread_->SetName("network_thread", nullptr);
    RTC_CHECK(network_thread_->Start()) << "Failed to start thread";

    worker_thread_ = rtc::Thread::Create();
    worker_thread_->SetName("worker_thread", nullptr);
    RTC_CHECK(worker_thread_->Start()) << "Failed to start thread";

    signaling_thread_ = rtc::Thread::Create();
    signaling_thread_->SetName("signaling_thread", nullptr);
    RTC_CHECK(signaling_thread_->Start()) << "Failed to start thread";

#ifdef DISABLE_LEGACY_TLS_PROTOCOL_VERSIONS
    std::string strTest(webrtc::field_trial::FindFullName("WebRTC-LegacyTlsProtocols"));
    bool test = webrtc::field_trial::IsDisabled("WebRTC-LegacyTlsProtocols");
    RTC_LOG_T_F(LS_VERBOSE) << "test:" << test << " strTest:" << strTest;
    webrtc::field_trial::InitFieldTrialsFromString("WebRTC-LegacyTlsProtocols/Disabled/");
    strTest = webrtc::field_trial::FindFullName("WebRTC-LegacyTlsProtocols");
    test = webrtc::field_trial::IsDisabled("WebRTC-LegacyTlsProtocols");
    RTC_LOG_T_F(LS_VERBOSE) << "test:" << test << " strTest:" << strTest;
#endif

    RTC_LOG_T_F(LS_VERBOSE) << "audio_input_file_ " + audio_input_file_;
    RTC_LOG_T_F(LS_VERBOSE) << "audio_output_file_ " + audio_output_file_;
    RTC_LOG_T_F(LS_VERBOSE) << "video_input_file_ " + video_input_file_;
    RTC_LOG_T_F(LS_VERBOSE) << "video_output_file_ " + video_output_file_;

#ifdef VCP_MEDIA_PROCESSOR
   // audio_transformers_.push_back(std::make_shared<VonageNoopAudioTransformer>());
#ifndef VCP_TFLITE_ML_TRANSFORMERS
   // video_transformers_.push_back(std::make_shared<VonageInverseColorVideoTransformer>());
    //video_transformers_.push_back(std::make_shared<VonageUnityVideoTransformer>());
#endif
#endif
}

RTCEngine::RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
                     bool loopback,
                     const std::string& audio_input_file,
                     const std::string& audio_output_file,
                     const std::string& video_input_file,
                     const std::string& video_output_file,
                     std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink) : RTCEngine(servers, loopback, audio_input_file, audio_output_file, video_input_file, video_output_file) {
    RTC_LOG_T_F(LS_VERBOSE);

    remote_sink_ = std::move(remote_sink);
}

RTCEngine::RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
                     bool loopback,
                     const std::string& audio_input_file,
                     const std::string& audio_output_file,
                     const std::string& video_input_file,
                     const std::string& video_output_file,
                     rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
                     RTCEngineObserver* observer) : RTCEngine(servers, loopback, audio_input_file, audio_output_file, video_input_file, video_output_file) {
    RTC_LOG_T_F(LS_VERBOSE);

    video_source_ = video_source;
    observer_ = observer;
    if ((video_source_ == nullptr) && (observer_ != nullptr)) {
        observer_->OnStartVideoCapture(signaling_thread_.get(), worker_thread_.get());
    }
}

RTCEngine::RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
                     bool loopback,
                     const std::string& audio_input_file,
                     const std::string& audio_output_file,
                     const std::string& video_input_file,
                     const std::string& video_output_file,
                     rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
                     RTCEngineObserver* observer,
                     std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink) : RTCEngine(servers, loopback, audio_input_file, audio_output_file, video_input_file, video_output_file) {
    RTC_LOG_T_F(LS_VERBOSE);

    video_source_ = video_source;
    observer_ = observer;
    if ((video_source_ == nullptr) && (observer_ != nullptr)) {
        observer_->OnStartVideoCapture(signaling_thread_.get(), worker_thread_.get());
    }
    local_sink_ = std::move(local_sink);
}

RTCEngine::RTCEngine(webrtc::PeerConnectionInterface::IceServers servers,
                     bool loopback,
                     const std::string& audio_input_file,
                     const std::string& audio_output_file,
                     const std::string& video_input_file,
                     const std::string& video_output_file,
                     rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source,
                     RTCEngineObserver* observer,
                     std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink,
                     const std::string& ml_model_file_path) : RTCEngine(servers, loopback, audio_input_file, audio_output_file, video_input_file, video_output_file) {
    RTC_LOG_T_F(LS_VERBOSE);

    video_source_ = video_source;
    observer_ = observer;
    if ((video_source_ == nullptr) && (observer_ != nullptr)) {
        observer_->OnStartVideoCapture(signaling_thread_.get(), worker_thread_.get());
    }
    local_sink_ = std::move(local_sink);
    ml_model_file_path_ = ml_model_file_path;

#ifdef VCP_MEDIA_PROCESSOR
#ifdef VCP_TFLITE_ML_TRANSFORMERS
    BackgroundBlurConfig videoConfig(ml_model_file_path_);
    videoConfig.SetRadius(BlurRadius::kHigh);
    video_transformers_.push_back(VonageVideoTransformer::Create(videoConfig));
#endif
#endif

}

RTCEngine::~RTCEngine() {
    RTC_LOG_T_F(LS_VERBOSE);

    DeletePeerConnection();
    peer_connection_factory_.release();
    peer_connection_factory_ = nullptr;
    if (network_thread_.get() != nullptr) {
        network_thread_->Stop();
        network_thread_ = nullptr;
    }
    if (worker_thread_.get() != nullptr) {
        worker_thread_->Stop();
        worker_thread_ = nullptr;
    }
    if (signaling_thread_.get() != nullptr) {
        signaling_thread_->Stop();
        signaling_thread_ = nullptr;
    }
    task_queue_factory_ = nullptr;
    if (audio_processing_.get() != nullptr) {
        audio_processing_ = nullptr;
    }
    adm_ = nullptr;
    remote_sink_ = nullptr;
    video_source_ = nullptr;

#ifdef VCP_MEDIA_PROCESSOR
    video_processor_ = nullptr;
    audio_processor_ = nullptr;
#endif
}

void RTCEngine::OverrideAudioOutputFile(const std::string& audio_output_file) {
    RTC_LOG_T_F(LS_VERBOSE);

    audio_output_file_ = audio_output_file;
    RTC_LOG_T_F(LS_VERBOSE) << "audio_output_file_ " + audio_output_file_;
}

void RTCEngine::CreateOffer() {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!EnsurePeerConnectionFactory() || !CreatePeerConnection()) {
        return;
    }

    webrtc::PeerConnectionInterface::RTCOfferAnswerOptions options;
    if (!loopback_) {
        options.offer_to_receive_video = false;
        options.offer_to_receive_audio = false;
    }
    peer_connection_->CreateOffer(this, options);
}

void RTCEngine::SetLocalDescription(const webrtc::SdpType& type, const std::string& sdp) {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!EnsurePeerConnectionFactory() || !CreatePeerConnection()) {
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
    peer_connection_->SetLocalDescription(DummySetSessionDescriptionObserver::Create(), description.release());
}

void RTCEngine::CreateAnswer() {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!EnsurePeerConnectionFactory() || !CreatePeerConnection()) {
        return;
    }
    peer_connection_->CreateAnswer(this, webrtc::PeerConnectionInterface::RTCOfferAnswerOptions());
}

void RTCEngine::SetRemoteDescription(const webrtc::SdpType& type, const std::string& sdp) {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!EnsurePeerConnectionFactory() || !CreatePeerConnection()) {
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
    peer_connection_->SetRemoteDescription(DummySetSessionDescriptionObserver::Create(), description.release());
}

void RTCEngine::SetCandidate(const std::string& mid, const int mline_index, const std::string& icecandidate) {
    RTC_LOG_T_F(LS_VERBOSE);
    if (!EnsurePeerConnectionFactory() || !CreatePeerConnection()) {
        return;
    }
    webrtc::SdpParseError error;
    std::unique_ptr<webrtc::IceCandidateInterface> candidate(webrtc::CreateIceCandidate(mid, mline_index, icecandidate, &error));
    if (candidate.get() == nullptr) {
        RTC_LOG_T_F(LS_WARNING) << "Can't parse received candidate message. "
                                   "SdpParseError was: "
                                << error.description;
      return;
    }
    if (!peer_connection_->AddIceCandidate(candidate.get())) {
        RTC_LOG_T_F(LS_WARNING) << "Failed to apply the received candidate";
        return;
    }
    RTC_LOG_T_F(LS_VERBOSE) << "Candidate " << icecandidate << " set";

}

void RTCEngine::RegisterObserver(RTCEngineObserver* observer) {
    RTC_LOG_T_F(LS_VERBOSE);
    observer_ = observer;
}

bool RTCEngine::trickle_ice() {
    RTC_LOG_T_F(LS_VERBOSE);
    return trickle_ice_;
}

void RTCEngine::GetStats() {
    RTC_LOG_T_F(LS_VERBOSE);
    if (peer_connection_.get() == nullptr) {
        return;
    }
    peer_connection_->GetStats(DummyRTCStatsCollectorCallback::Create());
}

void RTCEngine::SetVideoTrackSource(rtc::scoped_refptr<webrtc::VideoTrackSourceInterface> video_source) {
    RTC_LOG_T_F(LS_VERBOSE);
    video_source_ = video_source;
}

void RTCEngine::SetRemoteVideoSink(std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> remote_sink) {
    RTC_LOG_T_F(LS_VERBOSE);

    remote_sink_ = std::move(remote_sink);
}

void RTCEngine::SetPreferredVideoCodecs(const std::vector<std::string> codecs) {
    RTC_LOG_T_F(LS_VERBOSE);

    video_codecs_.clear();
    for (const auto& format : codecs) {
        if (format == std::string(cricket::kVp8CodecName)) {
            video_codecs_.emplace_back(cricket::kVp8CodecName);
        } else if (format == std::string(cricket::kVp9CodecName)) {
            video_codecs_.emplace_back(cricket::kVp9CodecName);
        } else if (format == std::string(cricket::kH264CodecName)) {
            // In case H264 is asked we consider/include the contrained baseline one.
            video_codecs_.emplace_back(webrtc::SdpVideoFormat(cricket::kH264CodecName, {{cricket::kH264FmtpPacketizationMode, cricket::kParamValueTrue},{cricket::kH264FmtpProfileLevelId, cricket::kH264ProfileLevelConstrainedBaseline}}));
        } else {
            RTC_LOG_T_F(LS_WARNING) << format << " video codec ignored";
        }
        // TODO(jaoo): Maybe support more video codecs in the future.
    }
}

void RTCEngine::EnableMediaProccesorTest() {
    RTC_LOG_T_F(LS_VERBOSE);
    
    enable_media_processor_test_ = true;
    if (!EnsurePeerConnectionFactory() || !CreatePeerConnection()) {
        enable_media_processor_test_ = false;
    }
}

void RTCEngine::Shutdown() {
    RTC_LOG_T_F(LS_VERBOSE);
    DeletePeerConnection();
}

bool RTCEngine::EnsurePeerConnectionFactory() {
    RTC_LOG_T_F(LS_VERBOSE);
    if (peer_connection_factory_.get() != nullptr) {
        return true;
    }

    worker_thread_->Invoke<void>(RTC_FROM_HERE, [&]{
        task_queue_factory_ = webrtc::CreateDefaultTaskQueueFactory();
#ifdef ANDROID_TEST
        adm_ = webrtc::AudioDeviceModule::Create(webrtc::AudioDeviceModule::kAndroidJavaAudio, task_queue_factory_.get());
#else
        adm_ = webrtc::AudioDeviceModule::Create(webrtc::AudioDeviceModule::kPlatformDefaultAudio, task_queue_factory_.get());
#endif
    });

    if (adm_) {
        RTC_LOG(LS_VERBOSE) << "Using system audio device";
#if !defined(VCP_MEDIA_PROCESSOR)
        if(!audio_input_file_.empty()) {
            audio_processing_ = new rtc::RefCountedObject<vonage::RTCAudioProcessing>(audio_input_file_);
        }
#endif
    } else {
        // Note: It is not expected to run testee sides in host machines where we have to use a file audio device.
        RTC_LOG(LS_VERBOSE) << "Using file audio device";
        webrtc::FileAudioDeviceFactory::SetFilenamesToUse(audio_output_file_.c_str(), audio_output_file_.c_str());
        adm_ = webrtc::AudioDeviceModule::Create(webrtc::AudioDeviceModule::kFileAudioDevice, task_queue_factory_.get());
    }

    //auto video_coding_encoding_engine = RTCVideoEncodingDecodingEngine::CreateEngine();
    peer_connection_factory_ = webrtc::CreatePeerConnectionFactory(network_thread_.get(),
                                                                   worker_thread_.get(),
                                                                   signaling_thread_.get(),
                                                                   adm_,
                                                                   webrtc::CreateBuiltinAudioEncoderFactory(),
                                                                   webrtc::CreateBuiltinAudioDecoderFactory(),
                                                                   webrtc::CreateBuiltinVideoEncoderFactory(),
                                                                   webrtc::CreateBuiltinVideoDecoderFactory(),
                                                                   /* audio_mixer */ nullptr,
                                                                   audio_processing_ ? audio_processing_ : nullptr,
                                                                   /* audio_frame_processor */ nullptr);

    bool success = peer_connection_factory_.get() != nullptr;
    if (success && loopback_) {
        webrtc::PeerConnectionFactoryInterface::Options options;
        options.disable_encryption = true;
        peer_connection_factory_->SetOptions(options);
    }
    return success;
}

bool RTCEngine::CreatePeerConnection() {
    RTC_LOG_T_F(LS_VERBOSE);
    if (peer_connection_factory_.get() == nullptr) {
        return false;
    }
    if (peer_connection_.get() != nullptr) {
        return true;
    }
    webrtc::PeerConnectionInterface::RTCConfiguration config;
    config.sdp_semantics = webrtc::SdpSemantics::kUnifiedPlan;
    config.servers = servers_;
#ifdef OVERRIDE_DTLS_SRTP_GCM_CRYPTO_SUITES
    config.crypto_options = webrtc::CryptoOptions::NoGcm();
    // Fill up vector and enable given suites via srtp configuration member accordingly.
    config.crypto_options->srtp.enable_gcm_crypto_suites = true;
    config.crypto_options->crypto_suites.push_back(rtc::kSrtpAeadAes256Gcm);
    config.crypto_options->crypto_suites.push_back(rtc::kSrtpAeadAes128Gcm);
    config.crypto_options->srtp.enable_aes128_sha1_32_crypto_cipher = true;
    config.crypto_options->crypto_suites.push_back(rtc::kSrtpAes128CmSha1_32);
    config.crypto_options->srtp.enable_aes128_sha1_80_crypto_cipher = true;
    config.crypto_options->crypto_suites.push_back(rtc::kSrtpAes128CmSha1_80);
#elifdef DTLS_SRTP_GCM_CRYPTO_SUITES
    config.crypto_options = webrtc::CryptoOptions::NoGcm();
    config.crypto_options->srtp.enable_gcm_crypto_suites = true;
    // See https://chromium.googlesource.com/external/webrtc/+/branch-heads/4147/api/crypto/crypto_options.cc#47
    // In order to really force GCM crypto suites and negotiate them the other
    // side must not support SRTP_AES128_CM_SHA1_80.
    config.crypto_options->srtp.enable_aes128_sha1_80_crypto_cipher = false;
#endif
    if (loopback_) {
        config.enable_dtls_srtp = false;
    }
    webrtc::PeerConnectionDependencies pc_dependencies(this);
    auto error_or_peer_connection = peer_connection_factory_->CreatePeerConnectionOrError(config, std::move(pc_dependencies));
    if (error_or_peer_connection.ok()) {
        peer_connection_ = std::move(error_or_peer_connection.value());
        AddTracks();
        if (!audio_output_file_.empty()) {
           // audio_track_sink_ = std::make_unique<RTCAudioTrackSink>(audio_output_file_);
           // audio_track_sink_ = nullptr;
        }
    }

    return peer_connection_.get() != nullptr;
}

void RTCEngine::DeletePeerConnection() {
    RTC_LOG_T_F(LS_VERBOSE);
    if (peer_connection_.get() == nullptr) {
        return;
    }
    peer_connection_->Close();
    peer_connection_.release();
    peer_connection_ = nullptr;
   // audio_track_sink_ = nullptr;
}

void RTCEngine::AddTracks() {
    // TODO: WebRTC 99 Upgrade: Use transceivers model.
    RTC_LOG_T_F(LS_VERBOSE);
    if (!peer_connection_->GetSenders().empty()) {
      return;
    }

    rtc::scoped_refptr<webrtc::AudioTrackInterface> audio_track_interface(
        peer_connection_factory_->CreateAudioTrack(
            kAudioLabel, peer_connection_factory_->CreateAudioSource(
                             cricket::AudioOptions())));

#ifdef VCP_MEDIA_PROCESSOR
    audio_processor_.reset(new vonage::AudioProcessor(peer_connection_));
    audio_processor_->SetTransformers(audio_transformers_);
    if (audio_processor_->SetTrack(audio_track_interface) == false) {
        RTC_LOG_T_F(LS_WARNING) << "Audio processor set track method failed";
    }
#endif

    auto result_or_error = peer_connection_->AddTrack(audio_track_interface, {kStreamId});
    if (!result_or_error.ok()) {
        RTC_LOG_T_F(LS_ERROR) << "Failed to add audio track to PeerConnection: "
                              << result_or_error.error().message();
    }

    if (video_source_.get() != nullptr) {
        rtc::scoped_refptr<webrtc::VideoTrackInterface> video_track_interface = peer_connection_factory_->CreateVideoTrack(kVideoLabel, video_source_);
//#ifdef VCP_MEDIA_PROCESSOR
//        video_processor_.reset(new vonage::VideoProcessor());
//        video_processor_->SetTransformers(video_transformers_);
//        if (video_processor_->SetTrack(video_track_interface) == false) {
//            RTC_LOG_T_F(LS_WARNING) << "Video processor set track method failed";
//        }
//#endif
        result_or_error = peer_connection_->AddTrack(video_track_interface, {kStreamId});
        if (!result_or_error.ok()) {
            RTC_LOG_T_F(LS_ERROR) << "Failed to add video track to PeerConnection: "
                                  << result_or_error.error().message();
        }
        if (local_sink_.get() != nullptr) {
            video_track_interface->AddOrUpdateSink(local_sink_.get(), rtc::VideoSinkWants());
        }
        
        if ((enable_media_processor_test_ == true) && (remote_sink_.get() != nullptr)) {
            video_track_interface->AddOrUpdateSink(remote_sink_.get(), rtc::VideoSinkWants());
        }
    }
}

// PeerConnectionObserver implementation.
void RTCEngine::OnSignalingChange(webrtc::PeerConnectionInterface::SignalingState new_state) {
    RTC_LOG_T_F(LS_VERBOSE) << AsString(new_state);
}

void RTCEngine::OnAddTrack(rtc::scoped_refptr<webrtc::RtpReceiverInterface> receiver,
                const std::vector<rtc::scoped_refptr<webrtc::MediaStreamInterface>>& streams) {
    RTC_LOG_T_F(LS_VERBOSE) << "Receiver id " << receiver->id();
    auto track = receiver->track();
    if (track->kind() == webrtc::MediaStreamTrackInterface::kAudioKind) {
//        if (audio_track_sink_.get() != nullptr) {
//            for (auto stream : streams) {
//                webrtc::AudioTrackVector tracks = stream->GetAudioTracks();
//                for (auto track : tracks) {
//                   // track->AddSink(audio_track_sink_.get());
//                }
//            }
//        }
    }  else if (track->kind() == webrtc::MediaStreamTrackInterface::kVideoKind) {
        if (remote_sink_.get() != nullptr) {
            for (auto stream : streams) {
                webrtc::VideoTrackVector tracks = stream->GetVideoTracks();
                for (auto track : tracks) {
                    track->AddOrUpdateSink(remote_sink_.get(), rtc::VideoSinkWants());
                    
#ifdef VCP_MEDIA_PROCESSOR
                video_processor_.reset(new vonage::VideoProcessor());
                video_processor_->SetTransformers(video_transformers_);
                if (video_processor_->SetTrack(track) == false) {
                    RTC_LOG_T_F(LS_WARNING) << "Video processor set track method failed";
                }
#endif
                    
                }
            }
        }
    }
}

void RTCEngine::OnRemoveTrack(rtc::scoped_refptr<webrtc::RtpReceiverInterface> receiver) {
    RTC_LOG_T_F(LS_VERBOSE);
}

void RTCEngine::OnDataChannel(rtc::scoped_refptr<webrtc::DataChannelInterface> channel) {
    RTC_LOG_T_F(LS_VERBOSE);
}

void RTCEngine::OnRenegotiationNeeded() {
    RTC_LOG_T_F(LS_VERBOSE);
}

void RTCEngine::OnIceConnectionChange(webrtc::PeerConnectionInterface::IceConnectionState new_state) {
    RTC_LOG_T_F(LS_VERBOSE) << AsString(new_state);
}

void RTCEngine::OnIceGatheringChange(webrtc::PeerConnectionInterface::IceGatheringState new_state) {
    RTC_LOG_T_F(LS_VERBOSE) << AsString(new_state);

    if (new_state != webrtc::PeerConnectionInterface::IceGatheringState::kIceGatheringComplete) {
        return;
    }
    if (observer_ == nullptr) {
        return;
    }
    std::string sdp;
    const webrtc::SessionDescriptionInterface* sdi = peer_connection_->local_description();
    sdi->ToString(&sdp);
    RTC_LOG_T_F(LS_VERBOSE) << sdp;
    observer_->OnIceGatheringChangeComplete(sdp);
}

void RTCEngine::OnIceCandidate(const webrtc::IceCandidateInterface* candidate) {
    RTC_LOG_T_F(LS_VERBOSE);

    std::string candidate_string;
    candidate->ToString(&candidate_string);
    RTC_LOG_T_F(LS_VERBOSE) << "Candidate: " << candidate_string;
    RTC_LOG_T_F(LS_VERBOSE) << "Candidate sdp_mid: " << candidate->sdp_mid();
    RTC_LOG_T_F(LS_VERBOSE) << "Candidate sdp_mline_index: " << candidate->sdp_mline_index();

    if (loopback_) {
        if (!peer_connection_->AddIceCandidate(candidate)) {
            RTC_LOG_T_F(LS_WARNING) << "Failed to apply the received candidate";
        }
        return;
    }
    if (observer_ == nullptr) {
        return;
    }
    observer_->OnCandidate(candidate->sdp_mid(), candidate->sdp_mline_index(), candidate_string);
}

void RTCEngine::OnIceConnectionReceivingChange(bool receiving) {
    RTC_LOG_T_F(LS_VERBOSE);
}

// CreateSessionDescriptionObserver implementation.
void RTCEngine::OnSuccess(webrtc::SessionDescriptionInterface* desc) {
    RTC_LOG_T_F(LS_VERBOSE);

    if (desc == nullptr) {
        return;
    }
    std::string sdp;
    desc->ToString(&sdp);
    RTC_LOG_T_F(LS_VERBOSE) << sdp;
    switch (desc->GetType()) {
        case webrtc::SdpType::kOffer:
            if (loopback_) {
                SetLocalDescription(webrtc::SdpType::kOffer, sdp);
                SetRemoteDescription(webrtc::SdpType::kAnswer, sdp);
                return;
            }
            if (observer_ == nullptr) {
                return;
            }
            observer_->OnOffer(sdp);
            break;
        case webrtc::SdpType::kAnswer:
            if (observer_ == nullptr) {
                return;
            }
            observer_->OnAnswer(sdp);
            break;
        default:
            break;
    }
}

void RTCEngine::OnFailure(webrtc::RTCError error) {
    RTC_LOG_T_F(LS_VERBOSE) " " << ToString(error.type()) << ": " << error.message();
}

}
