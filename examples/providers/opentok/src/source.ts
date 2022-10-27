export class Source {
    private constructor(
        public readonly stream: MediaStream,
        public readonly videoTrack: MediaStreamTrack,
        public readonly audioTrack: MediaStreamTrack
    ) {}

    public static async camera(): Promise<Source> {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        return Source.stream(stream);
    }

    public static stream(stream: MediaStream): Source {
        return new Source(stream, stream.getVideoTracks()[0], stream.getAudioTracks()[0]);
    }
}
