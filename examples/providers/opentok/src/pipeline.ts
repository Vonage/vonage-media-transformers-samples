import { MediaProcessor, MediaProcessorConnector } from "@vonage/media-processor";
import { Source } from "./source";
import { Target } from "./target";
import { EventEmitter } from "@vonage/js-nameless-events";

export interface PipelineConfig {
    source: Source;
    targetOriginal?: Target;
    targetProcessed: Target;
    videoTransformers: Transformer[];
    audioTransformers: Transformer[];
}

export class Pipeline {
    public onStart: EventEmitter = new EventEmitter();
    public onStop: EventEmitter = new EventEmitter();

    // IO
    private readonly source: Source;
    private readonly targetOriginal?: Target;
    private readonly targetProcessed: Target;

    // Processing
    private started: boolean = false;
    private videoTransformers: Transformer[];
    private audioTransformers: Transformer[];
    private videoMediaProcessor?: MediaProcessor;
    private audioMediaProcessor?: MediaProcessor;

    constructor(config: PipelineConfig) {
        this.source = config.source;
        this.targetOriginal = config.targetOriginal;
        this.targetProcessed = config.targetProcessed;
        this.videoTransformers = config.videoTransformers;
        this.audioTransformers = config.audioTransformers;
    }

    public async start() {
        if (this.started) return;
        this.started = true;

        const streamOriginal = this.createOriginalStream();
        const streamProcessed = await this.createProcessedStream();

        this.targetProcessed.setStream(streamProcessed);
        await this.targetProcessed.start();

        this.targetOriginal?.setStream(streamOriginal);
        await this.targetOriginal?.start();

        this.onStart.fire();
    }

    public stop() {
        if (!this.started) return;
        this.started = false;

        this.destroyProcessedStream();

        const stream = this.createOriginalStream();
        this.targetProcessed.setStream(stream);
        this.targetProcessed.start();

        this.targetOriginal?.setStream(stream);
        this.targetOriginal?.start();
        this.onStop.fire();
    }

    private createOriginalStream(): MediaStream {
        const stream = new MediaStream();
        stream.addTrack(this.source.videoTrack);
        stream.addTrack(this.source.audioTrack);
        return stream;
    }

    private async createProcessedStream(): Promise<MediaStream> {
        this.videoMediaProcessor = new MediaProcessor();
        this.audioMediaProcessor = new MediaProcessor();

        const videoConnector = new MediaProcessorConnector(this.videoMediaProcessor);
        const audioConnector = new MediaProcessorConnector(this.audioMediaProcessor);
        const [videoTrack, audioTrack] = await Promise.all([
            videoConnector.setTrack(this.source.videoTrack),
            audioConnector.setTrack(this.source.audioTrack),
            this.videoMediaProcessor.setTransformers(this.videoTransformers),
            this.audioMediaProcessor.setTransformers(this.audioTransformers),
        ]);
        const stream = new MediaStream();
        stream.addTrack(audioTrack);
        stream.addTrack(videoTrack);

        return stream;
    }

    private destroyProcessedStream() {
        this.videoMediaProcessor?.destroy();
        this.audioMediaProcessor?.destroy();
    }
}
