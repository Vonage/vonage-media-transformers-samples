import { MediaPipeModelType, FaceDetectionResults, MediaPipeResults} from '@vonage/ml-transformers'
import { MediapipePorcessInterface, MediapipeResultsListnerInterface } from './MediapipeInterfaces'

const FACE_DETECTION_TIME_GAP = 200000;
      
interface Size {
    width: number
    height: number
}

class MediapipeTransformer implements MediapipeResultsListnerInterface {

    mediapipePorcess_?: MediapipePorcessInterface
    mediapipeResult_?: MediaPipeResults
    mediapipeSelfieResult_?: ImageBitmap

    mediapipeCanvas_: OffscreenCanvas;
    mediapipeCtx_?: OffscreenCanvasRenderingContext2D

    faceDetectionlastTimestamp: number;
    videoDimension: Size;
    padding: Size;
    aspectRatioState: Boolean;
    aspectRatio: number;
    visibleRectDimension?: any;

    modelType_?: MediaPipeModelType
    constructor(){
        this.faceDetectionlastTimestamp = 0;
        this.videoDimension = {
            width: 640,
            height: 480,
        }
        this.padding = {
            width: 0,
            height: 0
        }

        this.aspectRatioState = false; 
        this.aspectRatio = this.videoDimension.width/this.videoDimension.height;

        this.mediapipeCanvas_ = new OffscreenCanvas(1, 1)
        let ctx = this.mediapipeCanvas_.getContext('2d', {alpha: false, desynchronized: true})
        if(ctx){
            this.mediapipeCtx_ = ctx
        }else {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }
    }

    onResult(result: MediaPipeResults | ImageBitmap): void {
        if(result instanceof ImageBitmap){
            this.mediapipeSelfieResult_ = result
            return
        }
        let faceDetectionresult = result as FaceDetectionResults

        if (faceDetectionresult.detections.length > 0) {
            this.mediapipeResult_ = result;
            this.calculateDimensions();
        }
    }
    
    init(modelType: MediaPipeModelType, videoDimension: Size, mediapipePorcess: MediapipePorcessInterface): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.modelType_ = modelType
            this.mediapipePorcess_ = mediapipePorcess
            this.videoDimension = videoDimension
            this.aspectRatio = this.videoDimension.width/this.videoDimension.height;
            resolve()
        })
    }

    transform(frame:VideoFrame, controller:TransformStreamDefaultController) {
        if(this.mediapipeCanvas_.width != frame.displayWidth || this.mediapipeCanvas_.height != frame.displayHeight){
            this.mediapipeCanvas_.width = frame.displayWidth
            this.mediapipeCanvas_.height = frame.displayHeight
        }
        
        let timestamp = frame.timestamp
        createImageBitmap(frame).then( image => {
            frame.close()
            this.processFrame(image, timestamp ? timestamp : Date.now(), controller)
            
        }).catch(e => {
            console.error(e)
            controller.enqueue(frame)
        })
    }

    async processFrame(image: ImageBitmap, timestamp: number, controller: TransformStreamDefaultController){
        if(timestamp - this.faceDetectionlastTimestamp >= FACE_DETECTION_TIME_GAP){
            this.faceDetectionlastTimestamp = timestamp;
            this.mediapipeProcess(image);
        }

        if(this.visibleRectDimension){
            const resizeFrame = new VideoFrame(image, {
                visibleRect: {
                    x: this.visibleRectDimension.visibleRectX,
                    y: this.visibleRectDimension.visibleRectY,
                    width: this.visibleRectDimension.visibleRectWidth,
                    height: this.visibleRectDimension.visibleRectHeight
                },
                timestamp,
                alpha: 'discard'
            })
            controller.enqueue(resizeFrame)
        }else {
            controller.enqueue(new VideoFrame(image, {timestamp, alpha: 'discard'}))
        }
        image.close()
    }

    mediapipeProcess(image: ImageBitmap): void{
        if (this.videoDimension.width !== image.width || this.videoDimension.height !== image.height ) {
            this.videoDimension.width = image.width;
            this.videoDimension.height = image.height;
        }
        this.mediapipeCtx_!.clearRect(0, 0, this.mediapipeCanvas_.width, this.mediapipeCanvas_.height)
        this.mediapipeCtx_?.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            this.mediapipeCanvas_.width,
            this.mediapipeCanvas_.height
        )
        this.mediapipePorcess_?.onSend(this.mediapipeCanvas_.transferToImageBitmap())
    }
    
    calculateDimensions(forceRecalculate = false) {
        let faceDetectionresult = this.mediapipeResult_ as FaceDetectionResults;

        let newWidth = Math.floor((faceDetectionresult.detections[0].boundingBox.width * this.videoDimension.width) + (this.padding.width*2));
        let newHeight = Math.floor((faceDetectionresult.detections[0].boundingBox.height * this.videoDimension.height) + (this.padding.height*2));
        let newX = Math.floor((faceDetectionresult.detections[0].boundingBox.xCenter * this.videoDimension.width) - (faceDetectionresult.detections[0].boundingBox.width * this.videoDimension.width)/2) - this.padding.width;
        newX = Math.max(0, newX);
        let newY = Math.floor((faceDetectionresult.detections[0].boundingBox.yCenter * this.videoDimension.height) - (faceDetectionresult.detections[0].boundingBox.height * this.videoDimension.height)/2) - this.padding.height;
        newY = Math.max(0, newY);
        
        if (this.aspectRatioState) {
            newWidth = this.aspectRatio * newHeight
            newX = Math.floor((faceDetectionresult.detections[0].boundingBox.xCenter * this.videoDimension.width) - (newWidth)/2);
            newX = Math.max(0, newX);
        }
        
        if (forceRecalculate || !this.visibleRectDimension || Math.abs(newX - this.visibleRectDimension.visibleRectX) > 70 || Math.abs(newY - this.visibleRectDimension.visibleRectY) > 70 ) {
            // Ensure x and y is even value
            let visibleRectX = (( newX % 2) === 0) ? newX : (newX + 1);
            let visibleRectY = (( newY % 2) === 0) ? newY : (newY + 1);
            // Ensure visibleRectWidth and visibleRectHeight fall within videoWidth and videoHeight
            let visibleRectWidth = (visibleRectX + newWidth) > this.videoDimension.width ? (this.videoDimension.width -  visibleRectX) : newWidth
            let visibleRectHeight = (visibleRectY + newHeight) > this.videoDimension.height ? (this.videoDimension.height -  visibleRectY) : newHeight
            this.visibleRectDimension= {
            visibleRectX,
            visibleRectY,
            visibleRectWidth,
            visibleRectHeight
            }
        }
    }

    setAspectRatioState(state: boolean) {
        this.aspectRatioState = state;
        this.calculateDimensions(true);
    }
    setPaddingWidth (width: number) {
        this.padding.width = width;
        this.calculateDimensions(true);
    }
    setPaddingHeight (height: number) {
        this.padding.height = height;
        this.calculateDimensions(true);
    }

    async flush() {
       if(this.mediapipeSelfieResult_){
            this.mediapipeSelfieResult_.close()
       }
    }
}
export default MediapipeTransformer