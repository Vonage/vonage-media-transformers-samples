import { MediaPipeModelType, FaceDetectionResults, MediaPipeResults} from '@vonage/ml-transformers'
import { MediapipePorcessInterface, MediapipeResultsListnerInterface } from './MediapipeInterfaces'

const FACE_DETECTION_TIME_GAP = 20000;
      
interface Size {
    width: number
    height: number
}
interface VideoInfo extends Size{
    frameRate: number
}

class MediapipeTransformer implements MediapipeResultsListnerInterface {

    mediapipeProcess_?: MediapipePorcessInterface
    mediapipeResult_?: MediaPipeResults

    mediapipeCanvas_: OffscreenCanvas;
    mediapipeCtx_?: OffscreenCanvasRenderingContext2D

    faceDetectionlastTimestamp: number;
    videoInfo: VideoInfo;
    padding: Size;
    visibleRectDimension?: any;
    visibleRectDimensionState?: any;

    frameMovingSteps?: any;

    modelType_?: MediaPipeModelType
    constructor(){
        this.faceDetectionlastTimestamp = 0;
        this.videoInfo = {
            width: 640,
            height: 480,
            frameRate: 30
        }
        this.padding = {
            width: 60,
            height: 100
        }
        this.frameMovingSteps = {
            x: 1,
            y: 1,
            width: 1,
            height: 1
        }

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
            return
        }
        let faceDetectionresult = result as FaceDetectionResults

        if (faceDetectionresult.detections.length > 0) {
            this.mediapipeResult_ = result;
            this.calculateDimensions();
        }
    }
    
    init(modelType: MediaPipeModelType, videoInfo: VideoInfo, mediapipePorcess: MediapipePorcessInterface): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.modelType_ = modelType
            this.mediapipeProcess_ = mediapipePorcess
            this.videoInfo = videoInfo
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
            if (this.visibleRectDimensionState.visibleRectX !== this.visibleRectDimension.visibleRectX) this.visibleRectDimensionState.visibleRectX = this.visibleRectDimensionState.visibleRectX > this.visibleRectDimension.visibleRectX ? this.visibleRectDimensionState.visibleRectX - this.frameMovingSteps.x : this.visibleRectDimensionState.visibleRectX + this.frameMovingSteps.x ;
            if (this.visibleRectDimensionState.visibleRectY !== this.visibleRectDimension.visibleRectY) this.visibleRectDimensionState.visibleRectY = this.visibleRectDimensionState.visibleRectY > this.visibleRectDimension.visibleRectY ? this.visibleRectDimensionState.visibleRectY - this.frameMovingSteps.y : this.visibleRectDimensionState.visibleRectY + this.frameMovingSteps.y;
            if (this.visibleRectDimensionState.visibleRectWidth !== this.visibleRectDimension.visibleRectWidth) this.visibleRectDimensionState.visibleRectWidth = this.visibleRectDimensionState.visibleRectWidth > this.visibleRectDimension.visibleRectWidth ? this.visibleRectDimensionState.visibleRectWidth - this.frameMovingSteps.width : this.visibleRectDimensionState.visibleRectWidth + this.frameMovingSteps.width;
            if (this.visibleRectDimensionState.visibleRectHeight !== this.visibleRectDimension.visibleRectHeight) this.visibleRectDimensionState.visibleRectHeight = this.visibleRectDimensionState.visibleRectHeight > this.visibleRectDimension.visibleRectHeight ? this.visibleRectDimensionState.visibleRectHeight - this.frameMovingSteps.height : this.visibleRectDimensionState.visibleRectHeight + this.frameMovingSteps.height;
            
            if (Math.abs(this.visibleRectDimensionState.visibleRectX - this.visibleRectDimension.visibleRectX) <= this.frameMovingSteps.x) this.visibleRectDimensionState.visibleRectX = this.visibleRectDimension.visibleRectX
            if (Math.abs(this.visibleRectDimensionState.visibleRectY  - this.visibleRectDimension.visibleRectY) <= this.frameMovingSteps.y) this.visibleRectDimensionState.visibleRectY = this.visibleRectDimension.visibleRectY
            if (Math.abs(this.visibleRectDimensionState.visibleRectWidth  - this.visibleRectDimension.visibleRectWidth) <= this.frameMovingSteps.width) this.visibleRectDimensionState.visibleRectWidth = this.visibleRectDimension.visibleRectWidth
            if (Math.abs(this.visibleRectDimensionState.visibleRectHeight  - this.visibleRectDimension.visibleRectHeight) <= this.frameMovingSteps.height) this.visibleRectDimensionState.visibleRectHeight = this.visibleRectDimension.visibleRectHeight
            
            const resizeFrame = new VideoFrame(image, {
                visibleRect: {
                    x: this.visibleRectDimensionState.visibleRectX,
                    y: this.visibleRectDimensionState.visibleRectY,
                    width: this.visibleRectDimensionState.visibleRectWidth,
                    height: this.visibleRectDimensionState.visibleRectHeight
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
        if (this.videoInfo.width !== image.width || this.videoInfo.height !== image.height ) {
            this.videoInfo.width = image.width;
            this.videoInfo.height = image.height;
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
        this.mediapipeProcess_?.onSend(this.mediapipeCanvas_.transferToImageBitmap())
    }
    
    calculateDimensions() {
        let faceDetectionresult = this.mediapipeResult_ as FaceDetectionResults;

        if (!faceDetectionresult.detections[0]) return;
        let newWidth = Math.floor((faceDetectionresult.detections[0].boundingBox.width * this.videoInfo.width) + (this.padding.width*2));
        let newHeight = Math.floor((faceDetectionresult.detections[0].boundingBox.height * this.videoInfo.height) + (this.padding.height*2));
        let newX = Math.floor((faceDetectionresult.detections[0].boundingBox.xCenter * this.videoInfo.width) - (faceDetectionresult.detections[0].boundingBox.width * this.videoInfo.width)/2) - this.padding.width;
        newX = Math.max(0, newX);
        let newY = Math.floor((faceDetectionresult.detections[0].boundingBox.yCenter * this.videoInfo.height) - (faceDetectionresult.detections[0].boundingBox.height * this.videoInfo.height)/2) - this.padding.height;
        newY = Math.max(0, newY);
        
        if (!this.visibleRectDimension || Math.abs(newX - this.visibleRectDimension.visibleRectX) >  10 || Math.abs(newY - this.visibleRectDimension.visibleRectY) > 10 ) {
            // Ensure x and y is even value
            let visibleRectX = (( newX % 2) === 0) ? newX : (newX + 1);
            let visibleRectY = (( newY % 2) === 0) ? newY : (newY + 1);
            // Ensure visibleRectWidth and visibleRectHeight fall within videoWidth and videoHeight
            let visibleRectWidth = (visibleRectX + newWidth) > this.videoInfo.width ? (this.videoInfo.width -  visibleRectX) : newWidth
            let visibleRectHeight = (visibleRectY + newHeight) > this.videoInfo.height ? (this.videoInfo.height -  visibleRectY) : newHeight
            this.visibleRectDimension= {
            visibleRectX,
            visibleRectY,
            visibleRectWidth,
            visibleRectHeight
            }
            if (!this.visibleRectDimensionState) this.visibleRectDimensionState = this.visibleRectDimension;
            else {
                this.frameMovingSteps= {
                    x: Math.max(Math.floor(Math.abs(this.visibleRectDimensionState.visibleRectX - this.visibleRectDimension.visibleRectX)/(this.videoInfo.frameRate/5)), 1),
                    y: Math.max(Math.floor(Math.abs(this.visibleRectDimensionState.visibleRectY - this.visibleRectDimension.visibleRectY)/(this.videoInfo.frameRate/5)),1),
                    width: Math.max(Math.floor(Math.abs(this.visibleRectDimensionState.visibleRectWidth - this.visibleRectDimension.visibleRectWidth)/(this.videoInfo.frameRate/5)),1),
                    height: Math.max(Math.floor(Math.abs(this.visibleRectDimensionState.visibleRectHeight - this.visibleRectDimension.visibleRectHeight)/(this.videoInfo.frameRate/5)),1)
                }
            }
        }
    }
}
export default MediapipeTransformer