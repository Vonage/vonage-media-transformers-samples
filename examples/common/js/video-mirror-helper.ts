class VideoMirrorHelper {
  private stream_?: MediaStream
  private video_: HTMLVideoElement | null
  
  constructor() {
    this.video_ = document.getElementById('source_video') as HTMLVideoElement
  }

  setStream(stream: MediaStream): void {
    this.stream_ = stream;
    this.maybeAddVideoElement_();
  }

  
  private maybeAddVideoElement_(): void {
    if (this.stream_ && this.video_) {
      this.video_.srcObject = this.stream_;
      this.video_.play();
    }
  }
}

export default VideoMirrorHelper;
