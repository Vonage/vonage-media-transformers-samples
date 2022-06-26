import { MediapipeHelper, MediaPipeModelType, MediaPipeResults, 
    FaceDetectionOptions, FaceMeshOptions, HandsOptions, HolisticOptions, SelfieSegmentationOptions, ObjectronOptions, 
    FaceDetectionResults,
    FaceMeshResults,
    HandsResults,
    HolisticResults,
    ObjectronResults} from '@vonage/ml-transformers'
import { NormalizedLandmark } from '@mediapipe/drawing_utils'
import './DrawingUtilsHelper'

class MediapipeTransformer{
    mediapipeHelper_: MediapipeHelper
    mediapipeResult_?: MediaPipeResults
    
    resultCanvas_: OffscreenCanvas;
    resultCtx_?: OffscreenCanvasRenderingContext2D

    modelType_?: MediaPipeModelType
    drawingUtils = window
    objectronCounter: number
    frameCounter: number
    constructor(){
        this.frameCounter = 0
        this.objectronCounter = 0
        this.mediapipeHelper_ = new MediapipeHelper()
        this.resultCanvas_ = new OffscreenCanvas(1, 1)
        let ctx = this.resultCanvas_.getContext('2d', {alpha: false, desynchronized: true})
        if(ctx){
            this.resultCtx_ = ctx
        }else {
            throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
        }
    }

    init(modelType: MediaPipeModelType): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.modelType_ = modelType
            if(this.modelType_ === 'selfie_segmentation'){
                alert("reallllllllly? we have a solution for that use vonage ml-transformers")
                reject("nahhhhh")
                return
            }
            this.mediapipeHelper_.initialize({
                mediaPipeModelConfigArray: [{modelType: modelType, options: this.getModelOptions(modelType), 
                listener: (results: MediaPipeResults) : void => {
                    if(this.modelType_ === 'objectron'){
                        if(this.mediapipeResult_){
                            let oldResults = this.mediapipeResult_ as ObjectronResults
                            let newResults = results as ObjectronResults
                            if(!!oldResults.objectDetections){
                                if(!!newResults.objectDetections && newResults.objectDetections.length > 0){
                                    this.mediapipeResult_ = newResults
                                    this.objectronCounter = 0
                                }else {
                                    this.objectronCounter++
                                }
                            } else {
                                this.mediapipeResult_ = newResults
                            }
                            if(this.objectronCounter == 60){
                                this.mediapipeResult_ = newResults
                                this.objectronCounter = 0
                            }
                        } else {
                            this.mediapipeResult_ = results
                        }
                    } else {
                        this.mediapipeResult_ = results
                    }
                }}]
              }).then( () => {
                resolve()
              }).catch(e => {
                  reject(e)
              })
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
        this.mediapipeHelper_.send(image).then( () => { 
            if(this.mediapipeResult_){
                this.resultCtx_?.save()
                this.resultCtx_?.clearRect(0, 0, this.resultCanvas_.width, this.resultCanvas_.height)
                this.resultCtx_?.drawImage(image,
                    0,
                    0,
                    image.width, 
                    image.height,
                    0,
                    0,
                    this.resultCanvas_.width,
                    this.resultCanvas_.height)
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
                }
                this.resultCtx_?.restore()
                // @ts-ignore
                controller.enqueue(new VideoFrame(this.resultCanvas_, {timestamp, alpha: 'discard'}))
            }else {
                controller.enqueue(new VideoFrame(image, {timestamp, alpha: 'discard'}))
            }
            this.frameCounter++
            image.close()
        }).catch(e => {
            throw e
        })
    }

    getModelOptions(modelType: MediaPipeModelType): FaceDetectionOptions | FaceMeshOptions | HandsOptions | HolisticOptions | ObjectronOptions | SelfieSegmentationOptions{
        let option: FaceDetectionOptions | FaceMeshOptions | HandsOptions | HolisticOptions | ObjectronOptions | SelfieSegmentationOptions = {}
        if(modelType === 'face_detection'){
            (option as FaceDetectionOptions) = {
                selfieMode: false,
                minDetectionConfidence: 0.1,
                model: 'short'
            }
        } else if (modelType === 'face_mesh'){
            (option as FaceMeshOptions) = {
                selfieMode: false,
                minDetectionConfidence: 0.1,
                minTrackingConfidence: 0.1,
                refineLandmarks: true
            }
        } else if (modelType === 'hands'){
            (option as HandsOptions) = {
                modelComplexity: 1,
                selfieMode: false,
                minDetectionConfidence: 0.1,
                minTrackingConfidence: 0.1
            }
        } else if( modelType === 'holistic'){
            (option as HolisticOptions) = {
                selfieMode: false,
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: true,
                minDetectionConfidence: 0.1,
                minTrackingConfidence: 0.1
            }
        } else if ( modelType === 'objectron'){
            (option as ObjectronOptions) = {
                selfieMode: false,
                modelName: 'Chair',
                maxNumObjects: 3,
            }
        } else if (modelType === 'selfie_segmentation'){
            (option as SelfieSegmentationOptions) = {
                selfieMode: false,
                modelSelection: 1
            }
        } 
        return option
    }

    drawFaceDetaction():void{
        let results = this.mediapipeResult_ as FaceDetectionResults
        if (results.detections.length > 0) {
            // @ts-ignore
            drawRectangle(
                // @ts-ignore
                this.resultCtx_, results.detections[0].boundingBox,
                {color: 'blue', lineWidth: 4, fillColor: '#00000000'})
            // @ts-ignore
            drawLandmarks(this.resultCtx_, results.detections[0].landmarks, {
                color: 'red',
                radius: 5})
        }
    }

    drawFaceMash():void{
        let results = this.mediapipeResult_ as FaceMeshResults
        if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_TESSELATION,
                  {color: '#C0C0C070', lineWidth: 1});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_RIGHT_EYE,
                {color: '#FF3030'});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_RIGHT_EYEBROW,
                  {color: '#FF3030'});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_LEFT_EYE,
                  {color: '#30FF30'});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_LEFT_EYEBROW,
                  {color: '#30FF30'});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_FACE_OVAL,
                  {color: '#E0E0E0'});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
                // @ts-ignore                       
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_RIGHT_IRIS,
                    {color: '#FF3030'});
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, FACEMESH_LEFT_IRIS,
                    {color: '#30FF30'});  
            }
        }
    }

    drawHands(): void{
        let results = this.mediapipeResult_ as HandsResults
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let index = 0; index < results.multiHandLandmarks.length; index++) {
                const classification = results.multiHandedness[index];
                const isRightHand = classification.label === 'Right';
                const landmarks = results.multiHandLandmarks[index];
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, HAND_CONNECTIONS,
                    {color: isRightHand ? '#00FF00' : '#FF0000'});
                // @ts-ignore
                drawLandmarks(this.resultCtx_, 
                    landmarks, {
                    color: isRightHand ? '#00FF00' : '#FF0000',
                    fillColor: isRightHand ? '#FF0000' : '#00FF00',
                    radius: (data: any) => {
                        // @ts-ignore
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
        let results = this.mediapipeResult_ as HolisticResults
        if(!this.resultCtx_){
            return
        }
        this.resultCtx_.lineWidth = 5;
        if (results.poseLandmarks) {
             // Pose...
            // @ts-ignore
            drawConnectors(this.resultCtx_, 
                //@ts-ignore
                results.poseLandmarks, POSE_CONNECTIONS,
                {color: 'white'})
            
            // @ts-ignore
            drawLandmarks(this.resultCtx_,Object.values(POSE_LANDMARKS_LEFT)
                .map((index: any) => results.poseLandmarks[index]),
                {visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)'})

            // @ts-ignore
            drawLandmarks(this.resultCtx_, Object.values(POSE_LANDMARKS_RIGHT)
                .map((index: any) => results.poseLandmarks[index]),
                {visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)'});
        }
        
        if (results.rightHandLandmarks) {
            this.resultCtx_.strokeStyle = 'white';
            this.connect([[
                    //@ts-ignore
                    results.poseLandmarks[POSE_LANDMARKS.RIGHT_ELBOW],
                    results.rightHandLandmarks[0]
                  ]]);
            // @ts-ignore
            drawConnectors(this.resultCtx_,  results.rightHandLandmarks, HAND_CONNECTIONS,
                {color: 'white'});

            // @ts-ignore
            drawLandmarks(this.resultCtx_, 
                results.rightHandLandmarks, {
                color: 'white',
                fillColor: 'rgb(0,217,231)',
                lineWidth: 2,
                radius: (data:any) => {
                    // @ts-ignore
                    return lerp(data.from!.z!, -0.15, .1, 10, 1);
                }
            })
        }
        if (results.leftHandLandmarks) {
            this.resultCtx_.strokeStyle = 'white';
            this.connect([[
                    //@ts-ignore
                    results.poseLandmarks[POSE_LANDMARKS.LEFT_ELBOW],
                    results.leftHandLandmarks[0]
                  ]]);
            // @ts-ignore
            drawConnectors(this.resultCtx_,  results.leftHandLandmarks, HAND_CONNECTIONS,
                {color: 'white'});

            // @ts-ignore
            drawLandmarks(this.resultCtx_, 
                results.leftHandLandmarks, {
                color: 'white',
                fillColor: 'rgb(255,138,0)',
                lineWidth: 2,
                radius: (data: any) => {
                    // @ts-ignore
                    return lerp(data.from!.z!, -0.15, .1, 10, 1);
                }
            })
        }
    }

    drawObjectron(): void {
        let results = this.mediapipeResult_ as ObjectronResults        
        if (!!results.objectDetections) {
            for (const detectedObject of results.objectDetections) {
                const landmarks = detectedObject.keypoints.map(x => x.point2d);
                // @ts-ignore
                drawConnectors(this.resultCtx_, landmarks, BOX_CONNECTIONS, {color: '#FF0000'});
                // @ts-ignore
                drawLandmarks(this.resultCtx_, [landmarks[0]], {color: '#FFFFFF'});
            }
        }
    }

    async flush() {
        await this.mediapipeHelper_.close()
    }
}
export default MediapipeTransformer