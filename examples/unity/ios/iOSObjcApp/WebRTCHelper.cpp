//
//  WebRTCHelper.cpp
//  iOSObjCApp
//
//  Created by Guy Mininberg on 18/10/2022.
//

#include "WebRTCHelper.hpp"
#include <api/peer_connection_interface.h>
#include <api/audio_codecs/audio_decoder_factory.h>
#include <api/audio_codecs/audio_encoder_factory.h>
#include <api/audio_codecs/builtin_audio_decoder_factory.h>
#include <api/audio_codecs/builtin_audio_encoder_factory.h>
#include <api/video_codecs/builtin_video_decoder_factory.h>
#include <api/video_codecs/builtin_video_encoder_factory.h>
#include <api/create_peerconnection_factory.h>
#include <api/task_queue/default_task_queue_factory.h>
#include <media_processor/media_processor.h>

#include <rtc_base/logging.h>
#include <rtc_base/ssl_adapter.h>
#include "transformers.h"

WebRTCHelper::WebRTCHelper(){
    RTC_LOG(LS_VERBOSE) << "WebRTCHelper";
    _worker = rtc::Thread::Create();
    _worker->Start();
    _signal = rtc::Thread::Create();
    _signal->Start();
    _network = rtc::Thread::CreateWithSocketServer();
    _network->Start();
}

WebRTCHelper::~WebRTCHelper(){
    RTC_LOG(LS_VERBOSE) << "~WebRTCHelper";
    _factory = nullptr;
    _worker->Stop();
    _signal->Stop();
    _network->Stop();
}

bool WebRTCHelper::init(webrtc::VideoTrackSourceInterface *videoSource, std::unique_ptr<rtc::VideoSinkInterface<webrtc::VideoFrame>> local_sink){
    _local_sink = std::move(local_sink);
    _factory = webrtc::CreatePeerConnectionFactory(_network.get(), _worker.get(), _signal.get(), nullptr,
                                                   webrtc::CreateBuiltinAudioEncoderFactory(), webrtc::CreateBuiltinAudioDecoderFactory(),
                                                   webrtc::CreateBuiltinVideoEncoderFactory(), webrtc::CreateBuiltinVideoDecoderFactory(),
                                                   nullptr, nullptr);
    _video_track = _factory->CreateVideoTrack("test", videoSource);
    _video_track->AddOrUpdateSink(_local_sink.get(), rtc::VideoSinkWants());
    
    auto video_processor_ = new vonage::VideoProcessor();
    
    _video_transformers.push_back(std::make_shared<vonage::VonageUnityVideoTransformer>());
    video_processor_->SetTransformers(_video_transformers);
    if (video_processor_->SetTrack(_video_track) == false) {
        RTC_LOG_T_F(LS_WARNING) << "Video processor set track method failed";
    }
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

