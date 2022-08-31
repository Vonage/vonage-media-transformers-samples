import VideoMirrorHelper from './video-mirror-helper.js';
import VideoSink from './video-sink.js';
import { MediaProcessorConnectorInterface } from '@vonage/media-processor'

class CameraSource {
  videoMirrorHelper_: VideoMirrorHelper;
  sink_: VideoSink
  stream_?: MediaStream;
  mediaProcessorConnector_?: MediaProcessorConnectorInterface
  videoTrack_?: MediaStreamTrack
  audioTrack_?: MediaStreamTrack

  constructor() {
    this.videoMirrorHelper_ = new VideoMirrorHelper();
    this.sink_ = new VideoSink();
  }

  init() : Promise<void> {
    return new Promise<void>((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({audio: false, video: true}).then( stream => {
        this.stream_ = stream
        this.videoTrack_ = this.stream_.getVideoTracks()[0]
        this.videoMirrorHelper_.setStream(this.stream_);
        resolve()
      }).catch(e => {
        reject(e)
      })
    })
  }

  setMediaProcessorConnector(mediaProcessorConnector: MediaProcessorConnectorInterface): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      this.mediaProcessorConnector_ = mediaProcessorConnector;
      if (!this.stream_) 
      {
        console.log('[CameraSource] Requesting camera.');
        reject("no stream")
      }
      this.mediaProcessorConnector_.setTrack(this.videoTrack_!).then( newTrack => {
        let processedStream = new MediaStream();
        processedStream.addTrack(newTrack);
        this.sink_.setMediaStream(processedStream);
        resolve();
      })
      .catch(e => {
        reject(e)
      })
    });
  }

  async stopMediaProcessorConnector() {
    if(this.mediaProcessorConnector_){
      this.mediaProcessorConnector_.destroy().then(() => {
        this.sink_.destroy()
      })
      .catch(e => {
        console.log(e);
      });      
    }
  }
}

export default CameraSource;
