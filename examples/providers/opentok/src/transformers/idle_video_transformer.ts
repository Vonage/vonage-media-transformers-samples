import { frameToCanvas } from "../utils/canvas";

export class IdleVideoTransformer {
  // Rendering
  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;

  constructor() {
    this.canvas = new OffscreenCanvas(0, 0);
    this.context = this.canvas.getContext(
      "2d"
    ) as OffscreenCanvasRenderingContext2D;
  }

  public async transform?(
    frame: VideoFrame,
    controller: TransformStreamDefaultController
  ) {
    frameToCanvas(frame, this.context);
    frame.close();
    controller.enqueue(
      new VideoFrame(this.canvas as any as HTMLCanvasElement, {
        timestamp: frame.timestamp ?? 0,
        alpha: "discard",
      })
    );
  }
}
