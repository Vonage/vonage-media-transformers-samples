export class PitchAudioTransformer {
    public async transform?(data: AudioData, controller: TransformStreamDefaultController) {
        controller.enqueue(data);
    }
}
