export function frameToCanvas(frame: VideoFrame, context: OffscreenCanvasRenderingContext2D) {
    context.canvas.width = frame.displayWidth;
    context.canvas.height = frame.displayHeight;
    context.beginPath();
    context.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
}
