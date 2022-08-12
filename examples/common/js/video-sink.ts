
class VideoSink {
  private video_: HTMLVideoElement | null
  constructor() {
    this.video_ = document.getElementById('priview_video') as HTMLVideoElement
  }

  setMediaStream(stream: MediaStream): void {
    if (this.video_ && stream!=null) {
      this.video_.srcObject = stream;
      this.video_.play();
    }
  }
  
  destroy(): void {
    if (this.video_) {
      this.video_.pause();
      this.video_.srcObject = null;
    }
  }
}

export default VideoSink;
