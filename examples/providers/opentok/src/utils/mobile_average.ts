export class MobileAverage {
    private sum: number = 0;
    private queue: number[] = [];

    constructor(private readonly length: number) {}

    public add(value: number) {
        this.queue.push(value);
        this.sum += value;

        while (this.queue.length > this.length) {
            const pop = this.queue.shift() as number;
            this.sum -= pop;
        }
    }

    public get value(): number {
        return this.sum / Math.max(1, this.queue.length);
    }
}
