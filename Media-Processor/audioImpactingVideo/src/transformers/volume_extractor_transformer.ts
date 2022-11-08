import { MobileAverage } from "../utils/mobile_average";

export interface VolumeOwnerTransformer extends Transformer {
    volume: number;
}

export class VolumeExtractorTransformer implements Transformer {
    private readonly averageVolume: MobileAverage = new MobileAverage(30);

    constructor(private readonly owners: VolumeOwnerTransformer[]) {}

    public async transform?(data: AudioData) {
        const format = "f32-planar";
        const count = data.numberOfFrames * data.numberOfChannels;
        const buffer = new Float32Array(count);
        let sum = 0;

        for (let c = 0; c < data.numberOfChannels; c++) {
            const offset = data.numberOfFrames * c;
            const samples = buffer.subarray(offset, offset + data.numberOfFrames);
            data.copyTo(samples, { planeIndex: c, format });

            for (let i = 0; i < samples.length; ++i) {
                sum += samples[i] ** 2;
            }
        }

        const volume = sum ** 0.5 / count;
        this.averageVolume.add(volume);
        this.owners.forEach((o) => (o.volume = this.averageVolume.value));
    }
}
