export class Target {
    private readonly element: HTMLVideoElement;

    constructor(id: string) {
        this.element = document.getElementById(id) as HTMLVideoElement;
    }

    public setStream(stream: MediaStream): Target {
        this.element.srcObject = stream;
        return this;
    }

    public start() {
        this.element.play();
    }
}
