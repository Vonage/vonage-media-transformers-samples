import { MediaProcessor, MediaProcessorConnector } from "@vonage/media-processor";
import { createVonageNoiseSuppression, VonageNoiseSuppression } from "@vonage/noise-suppression";
import { WavExportTransformer, WavExportTransformerOptions } from "./wav-export-transformer";

export interface PipelineOptions {
    disableWasmMultiThread: boolean;
    wavOptions?: WavExportTransformerOptions;
}

export class Pipeline {
    private outputStream?: MediaStream;
    private noiseSuppression?: VonageNoiseSuppression;
    private wavProcessor?: MediaProcessor;
    private wavTransformer?: WavExportTransformer;
    private constructor() {}

    private async init(track: MediaStreamTrack, options: PipelineOptions) {
        this.noiseSuppression = createVonageNoiseSuppression();
        const locationParts = window.location.href.split("/");
        if (
            locationParts[locationParts.length - 1].length === 0 ||
            locationParts[locationParts.length - 1].includes(".")
        ) {
            locationParts.pop();
        }
        await this.noiseSuppression.init({
            debug: true,
            disableWasmMultiThread: options.disableWasmMultiThread,
            assetsDirBaseUrl: locationParts.join("/"),
        });
        const noiseSuppressionConnector = this.noiseSuppression.getConnector();
        track = await noiseSuppressionConnector.setTrack(track);

        this.wavTransformer = new WavExportTransformer(options?.wavOptions);
        this.wavProcessor = new MediaProcessor();
        const wavConnector = new MediaProcessorConnector(this.wavProcessor);
        await this.wavProcessor.setTransformers([this.wavTransformer]);
        track = await wavConnector.setTrack(track);

        this.outputStream = new MediaStream();
        this.outputStream.addTrack(track);
    }

    public static async create(
        track: MediaStreamTrack,
        options: PipelineOptions
    ): Promise<Pipeline> {
        const pipeline = new Pipeline();
        await pipeline.init(track, options);
        return pipeline;
    }

    public getOutputStream(): MediaStream {
        if (!this.outputStream) {
            throw "undefined output";
        }
        return this.outputStream;
    }

    public async getLatency(): Promise<number> {
        return this.noiseSuppression?.getWasmLatencyNs() ?? -1;
    }

    public getWav(): string {
        if (!this.wavTransformer) {
            throw "wav transformer is undefined";
        }
        try {
            const wav = this.wavTransformer?.getWav();
            return wav.toDataURI();
        } catch (e) {
            return "";
        }
    }

    public async close() {
        await this.noiseSuppression?.close();
        await this.wavProcessor?.destroy();
    }
}
