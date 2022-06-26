
class VideoSink {
  constructor() {
    this.video_ = null;
    this.debugPath_ = 'debug.pipeline.sink_';
  }
  
  setDebugPath(path) {
    this.debugPath_ = path;
  }
  //WS: How do we set back the track?
  async setMediaStream(stream) {
    console.log('[VideoSink] Setting sink stream.', stream);
    if (!this.video_) {
      this.video_ =
        /** @type {!HTMLVideoElement} */ (document.createElement('video'));
      this.video_.classList.add('video', 'sinkVideo');
      document.getElementById('outputVideoContainer').appendChild(this.video_);
      console.log(
          '[VideoSink] Added video element to page.',
          `${this.debugPath_}.video_ =`, this.video_);
    }
    this.video_.srcObject = stream;
    this.video_.play();
  }
  
  destroy() {
    if (this.video_) {
      console.log('[VideoSink] Stopping sink video');
      this.video_.pause();
      this.video_.srcObject = null;
      this.video_.parentNode.removeChild(this.video_);
    }
  }
}

export default VideoSink;
