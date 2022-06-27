import { MediaPipeModelType, 
    FaceDetectionResults,
    FaceMeshResults,
    HandsResults,
    HolisticResults,
    ObjectronResults,
    SelfieSegmentationResults} from '@vonage/ml-transformers'
import { NormalizedLandmark, Data } from '@mediapipe/drawing_utils'
import { MediapipePorcessInterface, MediapipeResultsListnerInterface, MediaPipeFullResults } from './MediapipeInterfaces'
import './DrawingUtilsHelper'

class MediapipeTransformer implements MediapipeResultsListnerInterface {
    mediapipePorcess_?: MediapipePorcessInterface
    mediapipeResult_?: MediaPipeFullResults
    mediapipeSelfieResult_?: ImageBitmap
    
    resultCanvas_: OffscreenCanvas;
    resultCtx_?: OffscreenCanvasRenderingContext2D

    modelType_?: MediaPipeModelType

    constructor(){
        this.resultCanvas_ = new OffscreenCanvas(1, 1)
        let ctx = this.resultCanvas_.getContext('2d', {alpha: false, desynchronized: true})
        if(ctx){
            this.resultCtx_ = ctx
        }else {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }
    }

    onResult(result: MediaPipeFullResults | ImageBitmap): void {
        if(result instanceof ImageBitmap){
            this.mediapipeSelfieResult_ = result
            return
        }
        this.mediapipeResult_ = result
    }
    
    init(modelType: MediaPipeModelType, mediapipePorcess: MediapipePorcessInterface): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.modelType_ = modelType
            this.mediapipePorcess_ = mediapipePorcess
            resolve()
        })
    }

    async start() {

    }

    transform(frame:VideoFrame, controller:TransformStreamDefaultController) {
        if(this.resultCanvas_.width != frame.displayWidth || this.resultCanvas_.height != frame.displayHeight){
            this.resultCanvas_.width = frame.displayWidth
            this.resultCanvas_.height = frame.displayHeight
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

    processFrame(image: ImageBitmap, timestamp: number, controller: TransformStreamDefaultController): void{
        this.mediapipePorcess_?.onSend(image).then( () => { 
            if((this.mediapipeResult_ || this.mediapipeSelfieResult_) && this.resultCtx_){
                this.resultCtx_.save()
                this.resultCtx_.clearRect(0, 0, this.resultCanvas_.width, this.resultCanvas_.height)
                if(this.modelType_ != 'selfie_segmentation'){
                    this.resultCtx_.drawImage(image,
                        0,
                        0,
                        image.width, 
                        image.height,
                        0,
                        0,
                        this.resultCanvas_.width,
                        this.resultCanvas_.height)
                }
                if(this.modelType_ === 'face_detection'){
                    this.drawFaceDetaction()
                } else if( this.modelType_ === 'face_mesh'){
                    this.drawFaceMash()
                } else if( this.modelType_ === 'hands'){
                    this.drawHands()
                } else if ( this.modelType_ === 'holistic'){
                    this.drawHolistic()
                } else if( this.modelType_ === 'objectron' ){
                    this.drawObjectron()
                } else if(this.modelType_ === 'selfie_segmentation'){
                    this.drawSelfie(image)
                }
                this.resultCtx_.restore()
                // @ts-ignore
                controller.enqueue(new VideoFrame(this.resultCanvas_, {timestamp, alpha: 'discard'}))
            }else {
                controller.enqueue(new VideoFrame(image, {timestamp, alpha: 'discard'}))
            }
            image.close()
        }).catch(e => {
            throw e
        })
    }

    drawFaceDetaction():void{
        let results = this.mediapipeResult_?.mediaPipeResults as FaceDetectionResults
        if (results.detections.length > 0) {
            
            drawRectangle(
                this.resultCtx_, 
                results.detections[0].boundingBox,
                {color: 'blue', lineWidth: 4, fillColor: '#00000000'})
            
            drawLandmarks(
                this.resultCtx_,
                results.detections[0].landmarks, 
                {color: 'red', radius: 5})
        }
    }

    drawFaceMash():void{
        let results = this.mediapipeResult_?.mediaPipeResults as FaceMeshResults
        if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_TESSELATION,
                    {color: '#C0C0C070', lineWidth: 1});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_RIGHT_EYE,
                    {color: '#FF3030'});
                
                drawConnectors(
                    this.resultCtx_,
                    landmarks, 
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_RIGHT_EYEBROW,
                    {color: '#FF3030'});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_LEFT_EYE,
                    {color: '#30FF30'});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_LEFT_EYEBROW,
                    {color: '#30FF30'});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, this.mediapipeResult_?.facemashExtras?.FACEMESH_FACE_OVAL,
                    {color: '#E0E0E0'});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, this.mediapipeResult_?.facemashExtras?.FACEMESH_LIPS, 
                    {color: '#E0E0E0'});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks,
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_RIGHT_IRIS,
                    {color: '#FF3030'});
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.facemashExtras?.FACEMESH_LEFT_IRIS,
                    {color: '#30FF30'});  
            }
        }
    }

    drawHands(): void{
        let results = this.mediapipeResult_?.mediaPipeResults as HandsResults
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let index = 0; index < results.multiHandLandmarks.length; index++) {
                const classification = results.multiHandedness[index];
                const isRightHand = classification.label === 'Right';
                const landmarks = results.multiHandLandmarks[index];
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.handsExtras?.HAND_CONNECTIONS,
                    {color: isRightHand ? '#00FF00' : '#FF0000'});
                
                drawLandmarks(
                    this.resultCtx_, 
                    landmarks, {
                    color: isRightHand ? '#00FF00' : '#FF0000',
                    fillColor: isRightHand ? '#FF0000' : '#00FF00',
                    radius: (data: Data) => {
                        return lerp(data.from!.z!, -0.15, .1, 10, 1);
                    }
                });
            }
        }
    }

    connect(connectors: Array<[NormalizedLandmark, NormalizedLandmark]>): void {
      for (const connector of connectors) {
        const from = connector[0];
        const to = connector[1];
        if (from && to) {
          if (from.visibility && to.visibility &&
              (from.visibility < 0.1 || to.visibility < 0.1)) {
            continue;
          }
          this.resultCtx_?.beginPath();
          this.resultCtx_?.moveTo(from.x * this.resultCanvas_.width, from.y * this.resultCanvas_.height);
          this.resultCtx_?.lineTo(to.x * this.resultCanvas_.width, to.y * this.resultCanvas_.height);
          this.resultCtx_?.stroke();
        }
      }
    }

    drawHolistic(): void {
        let results = this.mediapipeResult_?.mediaPipeResults as HolisticResults
        if(!this.resultCtx_){
            return
        }
        this.resultCtx_.lineWidth = 5;
        if(!this.mediapipeResult_?.holisticExrtas){
            return
        }
        if (results.poseLandmarks) {
            drawConnectors(
                this.resultCtx_, 
                results.poseLandmarks, 
                this.mediapipeResult_.holisticExrtas.POSE_CONNECTIONS,
                {color: 'white'})
            
            drawLandmarks(
                this.resultCtx_,
                Object.values(this.mediapipeResult_.holisticExrtas.POSE_LANDMARKS_LEFT)
                .map((index: any) => results.poseLandmarks[index]),
                {visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)'})

            drawLandmarks(
                this.resultCtx_, 
                Object.values(this.mediapipeResult_.holisticExrtas.POSE_LANDMARKS_RIGHT)
                .map((index: any) => results.poseLandmarks[index]),
                {visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)'})            
        }
        
        if (results.rightHandLandmarks) {
            this.resultCtx_.strokeStyle = 'white';
            this.connect([[
                    results.poseLandmarks[this.mediapipeResult_.holisticExrtas.POSE_LANDMARKS.RIGHT_ELBOW],
                    results.rightHandLandmarks[0]
                ]]);
            
            drawConnectors(
                this.resultCtx_,  
                results.rightHandLandmarks, 
                this.mediapipeResult_.holisticExrtas.HAND_CONNECTIONS,
                {color: 'white'});

            
            drawLandmarks(
                this.resultCtx_, 
                results.rightHandLandmarks, {
                color: 'white',
                fillColor: 'rgb(0,217,231)',
                lineWidth: 2,
                radius: (data: Data) => {
                    return lerp(data.from!.z!, -0.15, .1, 10, 1);
                }
            })
        }
        if (results.leftHandLandmarks) {
            this.resultCtx_.strokeStyle = 'white';
            this.connect([[
                    results.poseLandmarks[this.mediapipeResult_.holisticExrtas.POSE_LANDMARKS.LEFT_ELBOW],
                    results.leftHandLandmarks[0]
                ]]);
            
            drawConnectors(
                this.resultCtx_,  
                results.leftHandLandmarks, 
                this.mediapipeResult_.holisticExrtas.HAND_CONNECTIONS,
                {color: 'white'});

            drawLandmarks(
                this.resultCtx_, 
                results.leftHandLandmarks, {
                color: 'white',
                fillColor: 'rgb(255,138,0)',
                lineWidth: 2,
                radius: (data: Data) => {
                    return lerp(data.from!.z!, -0.15, .1, 10, 1);
                }
            })
        }
    }

    drawObjectron(): void {
        let results = this.mediapipeResult_?.mediaPipeResults as ObjectronResults        
        if (!!results.objectDetections) {
            for (const detectedObject of results.objectDetections) {
                const landmarks = detectedObject.keypoints.map(x => x.point2d);
                
                drawConnectors(
                    this.resultCtx_, 
                    landmarks, 
                    this.mediapipeResult_?.objectronExtras?.BOX_CONNECTIONS, 
                    {color: '#FF0000'});
                
                drawLandmarks(
                    this.resultCtx_, 
                    [landmarks[0]], 
                    {color: '#FFFFFF'});
            }
        }
    }

    drawSelfie(image: ImageBitmap): void {
        if(!this.resultCtx_){
            return
        }
          
        if(!this.mediapipeSelfieResult_){
            return
        }
        this.resultCtx_.globalCompositeOperation = 'copy'
        this.resultCtx_.drawImage(
            this.mediapipeSelfieResult_, 
            0, 
            0, 
            this.resultCanvas_.width,
            this.resultCanvas_.height
        );

        this.resultCtx_!.globalCompositeOperation = "source-atop";
        this.resultCtx_!.filter = 'none'
        this.resultCtx_!.drawImage(
            image,
            0,
            0,
            image.width, 
            image.height
        )

        this.resultCtx_.globalCompositeOperation = 'destination-over'
        this.resultCtx_.fillStyle = '#0000FF7F';
        this.resultCtx_.fillRect(0, 0, this.resultCanvas_.width, this.resultCanvas_.height);
    }
    async flush() {
       
    }
}
export default MediapipeTransformer