class UnityTransformer {
    
    static BASE_URL: string = 'http://localhost:3000'
    unityGame_: any;

    //canvas for segmentation in frame size
    unityInputCanvas_: OffscreenCanvas
    unityInputCtx_?: OffscreenCanvasRenderingContext2D | null

    //canvas for segmentation in frame size
    unityOutputCanvas_: OffscreenCanvas
    unityOutputCtx_?: OffscreenCanvasRenderingContext2D | null

    //final result canvas
    resultCanvas_: OffscreenCanvas
    resultCtx_?: OffscreenCanvasRenderingContext2D | null
    unityimageData_!: ImageData

    constructor() {
        this.unityInputCanvas_ = new OffscreenCanvas(1, 1);
        this.unityInputCtx_ = this.unityInputCanvas_.getContext('2d', { desynchronized: true });
        if (!this.unityInputCtx_) {
            throw ('Unable to create OffscreenCanvasRenderingContext2D');
        }

        this.unityOutputCanvas_ = new OffscreenCanvas(1, 1);
        this.unityOutputCtx_ = this.unityOutputCanvas_.getContext('2d', { desynchronized: true });
        if (!this.unityOutputCtx_) {
            throw ('Unable to create OffscreenCanvasRenderingContext2D');
        }

        this.resultCanvas_ = new OffscreenCanvas(1, 1);
        this.resultCtx_ = this.resultCanvas_.getContext('2d', { desynchronized: true });
        if (!this.resultCtx_) {
            throw ('Unable to create OffscreenCanvasRenderingContext2D');
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
        if (this.resultCanvas_.width != frame.displayWidth || this.resultCanvas_.height != frame.displayHeight) {
            this.resultCanvas_.width = frame.displayWidth
            this.resultCanvas_.height = frame.displayHeight
        }

        if (this.unityGame_) {
            const timestamp: number = frame.timestamp ? frame.timestamp : Date.now();
            //@ts-ignore
            var vonageUnity: any = globalThis.VonageUnity;
            if (typeof vonageUnity === "object") {
                createImageBitmap(frame).then(image => {
                    frame.close()
                    this.processFrame(image, vonageUnity)
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

    toBytesInt32 = (num: number) => {
        const arr = new ArrayBuffer(4);
        const view = new DataView(arr);
        view.setUint32(0, num, false);
        return arr;
      }

    processFrame(image: ImageBitmap, vonageUnity: any) {

        if (this.unityInputCanvas_.width != vonageUnity.size.width || this.unityInputCanvas_.height != vonageUnity.size.height) {
            this.unityInputCanvas_.width = vonageUnity.size.width
            this.unityInputCanvas_.height = vonageUnity.size.height
        }

        if (this.unityOutputCanvas_.width != vonageUnity.size.width || this.unityOutputCanvas_.height != vonageUnity.size.height) {
            this.unityOutputCanvas_.width = vonageUnity.size.width
            this.unityOutputCanvas_.height = vonageUnity.size.height
            this.unityimageData_ = new ImageData(this.unityOutputCanvas_.width, this.unityOutputCanvas_.height)
        }

        this.unityInputCtx_!.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            this.unityInputCanvas_.width,
            this.unityInputCanvas_.height
        )
        let imageData = this.unityInputCtx_!.getImageData(
            0,
            0,
            this.unityInputCanvas_.width,
            this.unityInputCanvas_.height
        )

        if (this.unityGame_) {

            for (let i = 0; i < vonageUnity.size.width * vonageUnity.size.height; i++) {

                // from rgba to Unity argb
                this.unityGame_.Module.HEAPU32[(vonageUnity.input.array >> 2) + i] = ((imageData.data[i * 4 + 3] << 24) |  //a
                                                                                        (imageData.data[i * 4] << 16) |    //r
                                                                                        (imageData.data[i * 4 + 1] << 8) | //g
                                                                                        (imageData.data[i * 4 + 2]))       //b
            }

            this.unityGame_.SendMessage("ExampleBridge", "SetTexture");

            for (let i = 0; i < vonageUnity.size.width * vonageUnity.size.height; i++) {

                let bytes = new Uint8Array(this.toBytesInt32(this.unityGame_.Module.HEAPU32[(vonageUnity.output.array >> 2) + i]))

                // from Unity argb to rgba
                this.unityimageData_.data[i * 4] = bytes[1];
                this.unityimageData_.data[i * 4 + 1] = bytes[2];
                this.unityimageData_.data[i * 4 + 2] = bytes[3];
                this.unityimageData_.data[i * 4 + 3] = bytes[0];
            }

            this.unityOutputCtx_!.save()
            this.unityOutputCtx_!.clearRect(0, 0, this.unityOutputCanvas_.width, this.unityOutputCanvas_.height)
            this.unityOutputCtx_!.putImageData(this.unityimageData_, 0, 0)
            this.unityOutputCtx_!.restore()

            this.resultCtx_!.drawImage(
                this.unityOutputCanvas_,
                0,
                0,
                this.unityOutputCanvas_.width,
                this.unityOutputCanvas_.height,
                0,
                0,
                this.resultCanvas_.width,
                this.resultCanvas_.height
            )
        }
    }

    flush() {
    }
}
export default UnityTransformer