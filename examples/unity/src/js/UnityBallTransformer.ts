class UnityBallTransformer {
    canvas: any;
    script: any;
    unityGame?: object;
    number: any;
    //canvas for segmentation in frame size
    segmentationMaskFrameCanvas_: OffscreenCanvas;
    segmentationMaskFrameCtx_: OffscreenCanvasRenderingContext2D | null;
    //final result canvas
    resultCanvas_: OffscreenCanvas;
    resultCtx_: OffscreenCanvasRenderingContext2D | null
    imageDataCarrier!: ImageData;
    constructor() {
        this.script = document.createElement("script");
       this.canvas = document.getElementById('unity-canvas');
       this.canvas.style.width = 0 + 'px';
       this.canvas.style.height = 0 + 'px';
        //segmentationMask in frame size
        this.segmentationMaskFrameCanvas_ = new OffscreenCanvas(1, 1);
        this.segmentationMaskFrameCtx_ = this.segmentationMaskFrameCanvas_.getContext('2d', { alpha: false, desynchronized: true });
        if (!this.segmentationMaskFrameCtx_) {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }
      
        this.resultCanvas_ = new OffscreenCanvas(1, 1);
        this.resultCtx_ = this.resultCanvas_.getContext('2d', { alpha: false, desynchronized: true });
        if (!this.resultCtx_) {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }
        var config = {
            dataUrl: window.location.href + "/testbuild.data",
            frameworkUrl: window.location.href + "/testbuild.framework.js",
            codeUrl: window.location.href + "/testbuild.wasm",
        };
        this.script.src = window.location.href + "/testbuild.loader.js";
        this.script.onload = () => {
            //@ts-ignore
            createUnityInstance(this.canvas, config, (progress: number) => {
                console.log(progress)
            }).then((unityInstance: any) => {
                this.unityGame = unityInstance;
            }).catch((message: any) => {
                alert(message);
            });
        };
        document.body.appendChild(this.script);
    }
    start(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        })
    }
    async transform(frame: VideoFrame, controller: TransformStreamDefaultController) {
        if (this.segmentationMaskFrameCanvas_.width != frame.displayWidth || this.segmentationMaskFrameCanvas_.height != frame.displayHeight) {
            this.segmentationMaskFrameCanvas_.width = frame.displayWidth;
            this.segmentationMaskFrameCanvas_.height = frame.displayHeight;
            this.imageDataCarrier = new ImageData(this.segmentationMaskFrameCanvas_.width, this.segmentationMaskFrameCanvas_.height);
        }
        if (this.resultCanvas_.width != frame.displayWidth || this.resultCanvas_.height != frame.displayHeight) {
            this.resultCanvas_.width = frame.displayWidth;
            this.resultCanvas_.height = frame.displayHeight;
            
        }
        if (this.unityGame) {
            const timestamp: number = frame.timestamp;
            //@ts-ignore
            var VonageUnity: any = globalThis.VonageUnity;
            if (typeof VonageUnity === "object") {
                createImageBitmap(frame).then(image => {
                    frame.close()
                    this.processFrame( image)
                    
                    controller.enqueue(new VideoFrame(this.resultCanvas_, { timestamp, alpha: 'discard' }));
                }).catch(e => {
                    console.error("createImageBitmap", e);
                    controller.enqueue(frame)
                })
            }
            
        }
    }
    processFrame(image: ImageBitmap) {

        this.segmentationMaskFrameCtx_!.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            this.segmentationMaskFrameCanvas_.width,
            this.segmentationMaskFrameCanvas_.height
        )
        let imageData = this.segmentationMaskFrameCtx_!.getImageData(
            0,
            0,
            this.segmentationMaskFrameCanvas_.width,
            this.segmentationMaskFrameCanvas_.height
        )

        if (this.unityGame) {

            //@ts-ignore
            var VonageUnity: any = globalThis.VonageUnity;
            if (typeof VonageUnity === "object") {
                for (let i = 0; i < imageData.data.length; i += 4) {
                    this.unityGame.Module.HEAPF32[(VonageUnity.input.array >> 2) + i] = imageData.data[i] / 255

                    this.unityGame.Module.HEAPF32[(VonageUnity.input.array >> 2) + i + 1] = imageData.data[i + 1] / 255

                    this.unityGame.Module.HEAPF32[(VonageUnity.input.array >> 2) + i + 2] = imageData.data[i + 2] / 255

                    this.unityGame.Module.HEAPF32[(VonageUnity.input.array >> 2) + i + 3] = imageData.data[i + 3] / 255

                }

                this.unityGame.SendMessage("ExampleBridge", "SetTexture");

                for (let i = 0; i < imageData.data.length; i+=4) {
                    this.imageDataCarrier.data[i] = this.unityGame.Module.HEAPF32[(VonageUnity.output.array >> 2) + i]*255 

                    this.imageDataCarrier.data[i+1] = this.unityGame.Module.HEAPF32[(VonageUnity.output.array >> 2) + i+1]*255

                    this.imageDataCarrier.data[i+2] = this.unityGame.Module.HEAPF32[(VonageUnity.output.array >> 2) + i+2]*255 

                    this.imageDataCarrier.data[i+3] =  this.unityGame.Module.HEAPF32[(VonageUnity.output.array >> 2) + i+3]*255

                }
                this.resultCtx_!.putImageData(this.imageDataCarrier, 0, 0)
               
                this.resultCtx_!.drawImage(
                    this.resultCanvas_,
                    0,
                    0,
                    image.width,
                    image.height,
                    0,
                    0,
                    image.width,
                    image.height
                )
            }
        }
    }

    /** @override */
    flush() {
        console.log('canvas transformer flush');

    }
}
export default UnityBallTransformer