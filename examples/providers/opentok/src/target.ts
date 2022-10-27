export abstract class Target {
    public static video(id: string): Target {
        return new TargetVideo(id);
    }

    public static stream(stream: MediaStream): Target {
        return new TargetStream(stream);
    }

    public abstract setStream(stream: MediaStream): void;
    public abstract start(): void;
}

class TargetStream extends Target {
    private audioTrack?: MediaStreamTrack;
    private videoTrack?: MediaStreamTrack;

    constructor(private readonly stream: MediaStream) {
        super();
    }

    public setStream(stream: MediaStream) {
        if (this.audioTrack) this.stream?.removeTrack(this.audioTrack);
        if (this.videoTrack) this.stream?.removeTrack(this.videoTrack);

        this.audioTrack = stream.getAudioTracks()[0];
        this.videoTrack = stream.getVideoTracks()[0];

        this.stream.addTrack(this.audioTrack);
        this.stream.addTrack(this.videoTrack);
    }

    public start() {}
}

class TargetVideo extends Target {
    private readonly element?: HTMLVideoElement;

    constructor(id: string) {
        super();
        this.element = document.getElementById(id) as HTMLVideoElement;
    }

    public setStream(stream: MediaStream) {
        this.element?.pause();
        this.element!.srcObject = stream;
    }

    public async start() {
        await this.element?.play();
    }
}
