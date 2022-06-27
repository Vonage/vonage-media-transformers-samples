import { MediapipeHelper, MediaPipeModelType, MediapipeConfig, MediaPipeResults, FaceDetectionOptions, FaceMeshOptions, HandsOptions, HolisticOptions, ObjectronOptions, SelfieSegmentationOptions } from "@vonage/ml-transformers"
import { MediapipePorcessInterface, MediapipeResultsListnerInterface, MediaPipeFullResults } from "./MediapipeInterfaces"

class MediapipeObject implements MediapipePorcessInterface{
    mediapipeHelper_?: MediapipeHelper
    mediapipeListener_?: MediapipeResultsListnerInterface

    constructor(){
        
    }

    private getModelOptions(modelType: MediaPipeModelType): FaceDetectionOptions | FaceMeshOptions | HandsOptions | HolisticOptions | ObjectronOptions | SelfieSegmentationOptions{
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

    init(modelType: MediaPipeModelType, mediapipeListener: MediapipeResultsListnerInterface): Promise<void>{
        return new Promise<void>((resolve, reject) => {
            this.mediapipeListener_ = mediapipeListener
            this.mediapipeHelper_ = new MediapipeHelper()
            let config: MediapipeConfig = {
                mediaPipeModelConfigArray:[{
                    listener: (result: MediaPipeResults) : void => {
                        let fullResult: MediaPipeFullResults = {
                            mediaPipeResults: result,
                            facemashExtras: undefined
                        }
                        this.mediapipeListener_?.onResult(fullResult)
                    },
                    modelType: modelType,
                    options: this.getModelOptions(modelType)
                }]
            }
            this.mediapipeHelper_.initialize(config).then( () => {
                resolve()
            }).catch(e => {
                reject(e)
            })
        })
    }

    onSend(data: ImageBitmap): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.mediapipeHelper_?.send(data).then( () => {
                resolve()
            }).catch(e => {
                reject(e)
            })
        })
    }
}

export default MediapipeObject
