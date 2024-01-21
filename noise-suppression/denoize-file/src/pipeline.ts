import { createVonageNoiseSuppression, VonageNoiseSuppression } from "@vonage/noise-suppression";

export interface PipelineOptions {
    disableWasmMultiThread: boolean;
}

export class Pipeline {
    private outputStream?: MediaStream;
    private noiseSuppression?: VonageNoiseSuppression;
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

    public async getWav(): Promise<string> {
        if (!this.noiseSuppression) {
            throw "transformer is undefined";
        }
        try {
            return this.noiseSuppression.getWav();
        } catch (e) {
            return "";
        }
    }

    public async close() {
        await this.noiseSuppression?.close();
    }
}
