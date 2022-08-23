class UnityBallTransformer {

    unityCanvas_: HTMLCanvasElement;
    unityScript_: HTMLScriptElement;
    unityGame_: any;

    //canvas for segmentation in frame size
    videoFrameCanvas_: OffscreenCanvas
    videoFrameCtx_: OffscreenCanvasRenderingContext2D | null

    //final result canvas
    resultCanvas_: OffscreenCanvas
    resultCtx_: OffscreenCanvasRenderingContext2D | null
    unityimageData_!: ImageData

    constructor() {
        this.unityScript_ = document.createElement("script");
        this.unityCanvas_ = document.createElement('canvas');

        this.unityCanvas_.width = 960
        this.unityCanvas_.height = 600

        //segmentationMask in frame size
        this.videoFrameCanvas_ = new OffscreenCanvas(1, 1);
        this.videoFrameCtx_ = this.videoFrameCanvas_.getContext('2d', { alpha: false, desynchronized: true });
        if (!this.videoFrameCtx_) {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }

        this.resultCanvas_ = new OffscreenCanvas(1, 1);
        this.resultCtx_ = this.resultCanvas_.getContext('2d', { alpha: false, desynchronized: true });
        if (!this.resultCtx_) {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }
        var config = {
            dataUrl: window.location.href + "/demoBuild.data",
            frameworkUrl: window.location.href + "/demoBuild.framework.js",
            codeUrl: window.location.href + "/demoBuild.wasm",
        };
        this.unityScript_.src = window.location.href + "/demoBuild.loader.js";
        this.unityScript_.onload = () => {
            //@ts-ignore
            createUnityInstance(this.canvas, config, (progress: number) => {
            }).then((unityInstance: any) => {
                this.unityGame_ = unityInstance;
            }).catch((message: any) => {
                alert(message);
            });
        };
        document.body.appendChild(this.unityScript_);
    }

    start() {
    }

    async transform(frame: VideoFrame, controller: TransformStreamDefaultController) {
        if (this.videoFrameCanvas_.width != frame.displayWidth || this.videoFrameCanvas_.height != frame.displayHeight) {
            this.videoFrameCanvas_.width = frame.displayWidth
            this.videoFrameCanvas_.height = frame.displayHeight
            this.unityimageData_ = new ImageData(frame.displayWidth, frame.displayHeight)
        }

        if (this.resultCanvas_.width != frame.displayWidth || this.resultCanvas_.height != frame.displayHeight) {
            this.resultCanvas_.width = frame.displayWidth
            this.resultCanvas_.height = frame.displayHeight
        }

        if (this.unityGame_) {
            const timestamp: number = frame.timestamp ? frame.timestamp : Date.now();
            //@ts-ignore
            var VonageUnity: any = globalThis.VonageUnity;
            if (typeof VonageUnity === "object") {
                createImageBitmap(frame).then(image => {
                    frame.close()
                    this.processFrame(image)
                    //@ts-ignore
                    controller.enqueue(new VideoFrame(this.resultCanvas_, { timestamp, alpha: 'discard' }));
                }).catch(e => {
                    console.error("createImageBitmap", e);
                    controller.enqueue(frame)
                })
            }
        }
    }
    processFrame(image: ImageBitmap) {

        this.videoFrameCtx_!.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            this.videoFrameCanvas_.width,
            this.videoFrameCanvas_.height
        )
        let imageData = this.videoFrameCtx_!.getImageData(
            0,
            0,
            this.videoFrameCanvas_.width,
            this.videoFrameCanvas_.height
        )

        if (this.unityGame_) {
            //@ts-ignore
            var VonageUnity: any = globalThis.VonageUnity;
            if (typeof VonageUnity === "object") {
                for (let i = 0; i < imageData.data.length; i += 4) {
                    this.unityGame_.Module.HEAPF32[(VonageUnity.input.array >> 2) + i] = imageData.data[i] / 255
                    this.unityGame_.Module.HEAPF32[(VonageUnity.input.array >> 2) + i + 1] = imageData.data[i + 1] / 255
                    this.unityGame_.Module.HEAPF32[(VonageUnity.input.array >> 2) + i + 2] = imageData.data[i + 2] / 255
                    this.unityGame_.Module.HEAPF32[(VonageUnity.input.array >> 2) + i + 3] = imageData.data[i + 3] / 255
                }

                this.unityGame_.SendMessage("ExampleBridge", "SetTexture");

                for (let i = 0; i < imageData.data.length; i += 4) {
                    this.unityimageData_.data[i] = this.unityGame_.Module.HEAPF32[(VonageUnity.output.array >> 2) + i] * 255
                    this.unityimageData_.data[i + 1] = this.unityGame_.Module.HEAPF32[(VonageUnity.output.array >> 2) + i + 1] * 255
                    this.unityimageData_.data[i + 2] = this.unityGame_.Module.HEAPF32[(VonageUnity.output.array >> 2) + i + 2] * 255
                    this.unityimageData_.data[i + 3] = this.unityGame_.Module.HEAPF32[(VonageUnity.output.array >> 2) + i + 3] * 255

                }
                this.resultCtx_!.putImageData(this.unityimageData_, 0, 0)

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

    flush() {
    }
}
export default UnityBallTransformer