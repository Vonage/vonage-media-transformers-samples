export class Source extends EventTarget {
    public duration: number = 0;

    private constructor(
        public readonly stream: MediaStream,
        public readonly track: MediaStreamTrack,
        public readonly audio?: HTMLAudioElement
    ) {
        super();
    }

    public static async dataUrl(dataUrl: string): Promise<Source> {
        return this.createSourceFromUrl(dataUrl);
    }

    public static async wav(name: string): Promise<Source> {
        return this.createSourceFromUrl(`/${name}.wav`);
    }

    public enable() {
        this.track!.enabled = true;
    }
    public disable() {
        this.track!.enabled = false;
    }
    public play() {
        this.audio!.play();
    }
    public pause() {
        this.audio!.pause();
    }
    public stop() {
        this.track!.stop();
    }

    private static createSourceFromUrl(src: any): Promise<Source> {
        return new Promise((resolve, reject) => {
            const audio = document.createElement("audio");
            let source: Source;
            audio.src = src;
            audio.loop = false;
            audio.volume = 1e-20;
            audio.onloadeddata = () => {
                const stream: MediaStream = (audio as any).captureStream();
                const tracks = stream.getAudioTracks();
                source = new Source(stream, tracks[0], audio);
                source.duration = audio.duration;
                resolve(source);
            };
            audio.ontimeupdate = (e) => {
                const event: any = new Event("timeupdate");
                event.timestamp = audio.currentTime;
                source?.dispatchEvent(event);
            };
            audio.onended = () => {
                const event: any = new Event("ended");
                source?.dispatchEvent(event);
            };
            audio.onerror = (...args) => {
                reject(audio.error);
            };
            audio.load();
        });
    }
}
