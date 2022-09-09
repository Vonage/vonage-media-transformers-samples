export class IdleAudioTransformer {
    public async transform?(data: AudioData, controller: TransformStreamDefaultController) {
        controller.enqueue(data);
    }
}
