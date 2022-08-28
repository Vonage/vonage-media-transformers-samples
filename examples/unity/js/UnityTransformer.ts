class UnityTransformer {
    static BASE_URL: string = 'https://unity-insertable-streams-sample.s3.amazonaws.com'
    unityGame_: any;

    //canvas for segmentation in frame size
    videoFrameCanvas_: OffscreenCanvas
    videoFrameCtx_?: OffscreenCanvasRenderingContext2D | null

    //final result canvas
    resultCanvas_: OffscreenCanvas
    resultCtx_?: OffscreenCanvasRenderingContext2D | null
    unityimageData_!: ImageData

    constructor() {
        this.videoFrameCanvas_ = new OffscreenCanvas(1, 1);
        this.videoFrameCtx_ = this.videoFrameCanvas_.getContext('2d', { alpha: false, desynchronized: true });
        if (!this.videoFrameCtx_) {
            throw('Unable to create OffscreenCanvasRenderingContext2D');
        }

        this.resultCanvas_ = new OffscreenCanvas(1, 1);
        this.resultCtx_ = this.resultCanvas_.getContext('2d', { alpha: false, desynchronized: true });
        if (!this.resultCtx_) {
            throw('Unable to create OffscreenCanvasRenderingContext2D');
        }
    }

    init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let unityCanvas: HTMLCanvasElement = document.createElement('canvas')
            let unityScript: HTMLScriptElement = document.createElement("script")

            unityCanvas.width = 960
            unityCanvas.height = 600
            unityCanvas.id = 'unity_canvas'
            unityCanvas.hidden = true
            document.body.appendChild(unityCanvas)

            unityScript.src = UnityTransformer.BASE_URL + "/demoBuild.loader.js";
            unityScript.onload = () => {
                var config = {
                    dataUrl: UnityTransformer.BASE_URL + "/demoBuild.data",
                    frameworkUrl: UnityTransformer.BASE_URL + "/demoBuild.framework.js",
                    codeUrl: UnityTransformer.BASE_URL + "/demoBuild.wasm",
                };
                //@ts-ignore
                createUnityInstance(unityCanvas, config, (progress: number) => {
                }).then((unityInstance: any) => {
                    this.unityGame_ = unityInstance;
                    resolve()
                }).catch((message: any) => {
                    reject(message);
                });
            };
            unityCanvas.appendChild(unityScript)
        })
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
        } else {
            controller.enqueue(frame)
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
export default UnityTransformer