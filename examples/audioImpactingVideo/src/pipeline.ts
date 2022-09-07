import { MediaProcessor, MediaProcessorConnector } from "@vonage/media-processor";
import { Source } from "./source";
import { Target } from "./target";

export interface PipelineConfig {
    source: Source;
    targetOriginal: Target;
    targetProcessed: Target;
    videoTransformers: Transformer[];
    audioTransformers: Transformer[];
}

export class Pipeline {
    // IO
    private readonly source: Source;
    private readonly targetOriginal: Target;
    private readonly targetProcessed: Target;

    // Processing
    private videoTransformers: Transformer[];
    private audioTransformers: Transformer[];
    private videoMediaProcessor: MediaProcessor = new MediaProcessor();
    private audioMediaProcessor: MediaProcessor = new MediaProcessor();

    // Streams
    private streamOriginal: MediaStream = new MediaStream();
    private streamProcessed: MediaStream = new MediaStream();

    private constructor(config: PipelineConfig) {
        this.source = config.source;
        this.targetOriginal = config.targetOriginal;
        this.targetProcessed = config.targetProcessed;
        this.videoTransformers = config.videoTransformers;
        this.audioTransformers = config.audioTransformers;
    }

    public static async create(config: PipelineConfig): Promise<Pipeline> {
        const pipeline = new Pipeline(config);
        await pipeline.init();
        return pipeline;
    }

    public set processingEnabled(value: boolean) {
        this.targetProcessed.setStream(value ? this.streamProcessed : this.streamOriginal);
        this.targetProcessed.start();
    }

    public async init() {
        const videoConnector = new MediaProcessorConnector(this.videoMediaProcessor);
        const audioConnector = new MediaProcessorConnector(this.audioMediaProcessor);

        const [videoTrack, audioTrack] = await Promise.all([
            videoConnector.setTrack(this.source.videoTrack),
            audioConnector.setTrack(this.source.audioTrack),
            this.videoMediaProcessor.setTransformers(this.videoTransformers),
            this.audioMediaProcessor.setTransformers(this.audioTransformers),
        ]);

        this.streamOriginal = new MediaStream();
        this.streamOriginal.addTrack(this.source.videoTrack);

        this.streamProcessed = new MediaStream();
        this.streamProcessed.addTrack(audioTrack);
        this.streamProcessed.addTrack(videoTrack);

        this.targetOriginal.setStream(this.streamOriginal);
        this.targetOriginal.start();

        this.processingEnabled = true;
    }
}
