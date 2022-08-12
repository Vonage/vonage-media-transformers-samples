import { convertCompilerOptionsFromJson } from "typescript";

class CanvasTransform{
  static type = "CANVAS";
  constructor() {
    this.x=300;
    this.y=300;
    this.canvas_ = null;
    this.ctx_ = null;
    this.use_image_bitmap_ = false;
    this.debugPath_ = 'debug.pipeline.frameTransform_';
  }

  start() {
     setInterval(this.move(), 100);
   // setTimeout(()=>{this.move }, 100);
    console.log('[CanvasTransform] start');
    this.canvas_ = new OffscreenCanvas(1, 1);
    this.ctx_ = /** @type {?CanvasRenderingContext2D} */ (
      this.canvas_.getContext('2d', {alpha: true, desynchronized: true}));
    if (!this.ctx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }
  }

  async transform(frame, controller) {
    const ctx = this.ctx_;
    if (!this.canvas_ || !ctx) {
      frame.close();
      return;
    }
    const width = frame.displayWidth;
    const height = frame.displayHeight;
    this.canvas_.width = width;
    this.canvas_.height = height;
    const timestamp = frame.timestamp;

    if (!this.use_image_bitmap_) {
      try {
        //this.move()
        ctx.save()
        ctx.beginPath()
        ctx.arc(this.x, this.y, 150, 0, Math.PI * 2, false)
        ctx.strokeStyle = '#2465D3'
        ctx.stroke()
        ctx.clip()
        ctx.drawImage(frame, this.x/2, this.y/2, 300, 300)
        ctx.restore()
        
       
        // Supported for Chrome 90+.
        //ctx.drawImage(frame, 0, 0);
      } catch (e) {
        // This should only happen on Chrome <90.
        console.log(
            '[CanvasTransform] Failed to draw VideoFrame directly. Falling ' +
                'back to ImageBitmap.',
            e);
        this.use_image_bitmap_ = true;
      }
    }
    if (this.use_image_bitmap_) {
      // Supported for Chrome <92.
      const inputBitmap = await frame.createImageBitmap();
      ctx.drawImage(inputBitmap, 0, 0);
      inputBitmap.close();
    }
    frame.close();

    ctx.shadowColor = '#34aeeb';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 50;
    ctx.strokeStyle = '#34aeeb';
    ctx.strokeRect(0, 0, width, height);

    if (!this.use_image_bitmap_) {
      try {
        // alpha: 'discard' is needed in order to send frames to a PeerConnection.
        controller.enqueue(new VideoFrame(this.canvas_, {timestamp, alpha: 'discard'}));
      } catch (e) {
        // This should only happen on Chrome <91.
        console.log(
            '[CanvasTransform] Failed to create VideoFrame from ' +
                'OffscreenCanvas directly. Falling back to ImageBitmap.',
            e);
        this.use_image_bitmap_ = true;
      }
    }
    if (this.use_image_bitmap_) {
      const outputBitmap = await createImageBitmap(this.canvas_);
      const outputFrame = new VideoFrame(outputBitmap, {timestamp});
      outputBitmap.close();
      controller.enqueue(outputFrame);
    }
  }

  /** @override */
  flush() {
    console.log('canvas transformer flush');
    
  }
  move () {
    console.log('in move');
    this.x = Math.floor(Math.random() * 300) + 1;
    //this.x *= Math.floor(Math.random() * 2) == 1 ? 1 : -1;
    this.y = Math.floor(Math.random() * 300) + 1;
   // this.y *= Math.floor(Math.random() * 2) == 1 ? 1 : -1;
}
    
}

export default CanvasTransform;