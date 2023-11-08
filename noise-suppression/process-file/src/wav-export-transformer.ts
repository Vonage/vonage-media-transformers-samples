import { WaveFile } from "wavefile";

type AudioDataBufferTypedArray = Float32Array | Int8Array | Int16Array | Int32Array;

export interface WavExportTransformerOptions {
    debug?: boolean;
}

export class WavExportTransformer {
    private sampleRate: number = 0;
    private channels: number[][] = [];

    constructor(private options: WavExportTransformerOptions = {}) {}

    public transform(data: AudioData, controller: TransformStreamDefaultController) {
        if (this.options.debug) {
            console.log("transform");
            console.log({
                duration: data.duration,
                sampleRate: data.sampleRate,
                numberOfChannels: data.numberOfChannels,
                numberOfFrames: data.numberOfFrames,
            });
        }
        if (this.sampleRate === 0) {
            this.sampleRate = data.sampleRate;
            this.channels = new Array(data.numberOfChannels).fill(0).map(() => []);
        }
        const channels = this.audioDataToTypedArray(data);
        for (let i = 0; i < data.numberOfChannels; ++i) {
            this.channels[i].push(...Array.from(channels[i]));
        }

        controller.enqueue(data);
    }

    public getWav(): any {
        const wav = new WaveFile();
        wav.fromScratch(this.channels.length, this.sampleRate, "32f", this.channels.flat());
        return wav;
    }

    private audioDataToTypedArray<O extends AudioDataBufferTypedArray>(
        data: AudioData
    ): Float32Array[] {
        const size = data.numberOfFrames;
        const channels: Float32Array[] = [];
        for (let i = 0; i < data.numberOfChannels; ++i) {
            const buffer = new Float32Array(size);
            const offset = data.numberOfFrames * i;
            const samples = buffer.subarray(offset, offset + data.numberOfFrames);
            data.copyTo(samples, { planeIndex: i, format: "f32-planar" });
            channels.push(buffer);
        }
        return channels;
    }
}
