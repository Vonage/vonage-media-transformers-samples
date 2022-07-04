import { MediapipeHelper, MediaPipeModelType, MediapipeConfig, MediaPipeResults, FaceDetectionOptions, FaceMeshOptions, HandsOptions, HolisticOptions, ObjectronOptions, SelfieSegmentationOptions, PoseOptions } from "@vonage/ml-transformers"
import { MediapipePorcessInterface, MediapipeResultsListnerInterface, MediapipeConsts } from "./MediapipeInterfaces"
import {VonageFacemash, VonageHands, VonageHolistic, VonageObjectron, VonagePose, VonageFacedetection} from '@vonage/ml-transformers'

class MediapipeObject implements MediapipePorcessInterface{
    mediapipeHelper_?: MediapipeHelper
    mediapipeListener_?: MediapipeResultsListnerInterface

    constructor(){
        
    }

    getMediapipeConsts(): MediapipeConsts {
        let ret: MediapipeConsts = {
            facedetection: {
                FACEDETECTION_LIPS: VonageFacedetection.FACEDETECTION_LIPS,
                FACEDETECTION_LEFT_EYE: VonageFacedetection.FACEDETECTION_LEFT_EYE,
                FACEDETECTION_LEFT_EYEBROW: VonageFacedetection.FACEDETECTION_LEFT_EYEBROW,
                FACEDETECTION_RIGHT_EYE: VonageFacedetection.FACEDETECTION_RIGHT_EYE,
                FACEDETECTION_RIGHT_EYEBROW: VonageFacedetection.FACEDETECTION_RIGHT_EYEBROW,
                FACEDETECTION_FACE_OVAL: VonageFacedetection.FACEDETECTION_FACE_OVAL,
                FACEDETECTION_CONTOURS: VonageFacedetection.FACEDETECTION_CONTOURS,
                FACEDETECTION_TESSELATION: VonageFacedetection.FACEDETECTION_TESSELATION
            },
            facemash: {
                FACE_GEOMETRY: VonageFacemash.FACE_GEOMETRY,
                FACEMESH_LIPS: VonageFacemash.FACEMESH_LIPS,
                FACEMESH_LEFT_EYE: VonageFacemash.FACEMESH_LEFT_EYE,
                FACEMESH_LEFT_EYEBROW: VonageFacemash.FACEMESH_LEFT_EYEBROW,
                FACEMESH_LEFT_IRIS: VonageFacemash.FACEMESH_LEFT_IRIS,
                FACEMESH_RIGHT_EYE: VonageFacemash.FACEMESH_RIGHT_EYE,
                FACEMESH_RIGHT_EYEBROW: VonageFacemash.FACEMESH_RIGHT_EYEBROW,
                FACEMESH_RIGHT_IRIS: VonageFacemash.FACEMESH_RIGHT_IRIS,
                FACEMESH_FACE_OVAL: VonageFacemash.FACEMESH_FACE_OVAL,
                FACEMESH_CONTOURS: VonageFacemash.FACEMESH_CONTOURS,
                FACEMESH_TESSELATION: VonageFacemash.FACEMESH_TESSELATION
            },
            holistic: {
                FACE_GEOMETRY: VonageHolistic.FACE_GEOMETRY,
                FACEMESH_LIPS: VonageHolistic.FACEMESH_LIPS,
                FACEMESH_LEFT_EYE: VonageHolistic.FACEMESH_LEFT_EYE,
                FACEMESH_LEFT_EYEBROW: VonageHolistic.FACEMESH_LEFT_EYEBROW,
                FACEMESH_LEFT_IRIS: VonageHolistic.FACEMESH_LEFT_IRIS,
                FACEMESH_RIGHT_EYE: VonageHolistic.FACEMESH_RIGHT_EYE,
                FACEMESH_RIGHT_EYEBROW: VonageHolistic.FACEMESH_RIGHT_EYEBROW,
                FACEMESH_RIGHT_IRIS: VonageHolistic.FACEMESH_RIGHT_IRIS,
                FACEMESH_FACE_OVAL: VonageHolistic.FACEMESH_FACE_OVAL,
                FACEMESH_CONTOURS: VonageHolistic.FACEMESH_CONTOURS,
                FACEMESH_TESSELATION: VonageHolistic.FACEMESH_TESSELATION,
                HAND_CONNECTIONS: VonageHolistic.HAND_CONNECTIONS,
                POSE_CONNECTIONS: VonageHolistic.POSE_CONNECTIONS,
                POSE_LANDMARKS: VonageHolistic.POSE_LANDMARKS,
                POSE_LANDMARKS_LEFT: VonageHolistic.POSE_LANDMARKS_LEFT,
                POSE_LANDMARKS_RIGHT: VonageHolistic.POSE_LANDMARKS_RIGHT,
                POSE_LANDMARKS_NEUTRAL: VonageHolistic.POSE_LANDMARKS_NEUTRAL
            },
            hands: {
                HAND_CONNECTIONS: VonageHands.HAND_CONNECTIONS
            },
            objectron: {
                BOX_CONNECTIONS: VonageObjectron.BOX_CONNECTIONS,
                BOX_KEYPOINTS: VonageObjectron.BOX_KEYPOINTS
            },
            pose: {
                POSE_CONNECTIONS: VonagePose.POSE_CONNECTIONS,
                POSE_LANDMARKS: VonagePose.POSE_LANDMARKS,
                POSE_LANDMARKS_LEFT: VonagePose.POSE_LANDMARKS_LEFT,
                POSE_LANDMARKS_RIGHT: VonagePose.POSE_LANDMARKS_RIGHT,
                POSE_LANDMARKS_NEUTRAL: VonagePose.POSE_LANDMARKS_NEUTRAL
            }
        }
        return ret
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
                modelName: 'Cup',
                maxNumObjects: 1,
            }
        } else if (modelType === 'selfie_segmentation'){
            (option as SelfieSegmentationOptions) = {
                selfieMode: false,
                modelSelection: 1
            }
        } else if (modelType === 'pose'){
            (option as PoseOptions) = {
                selfieMode: false,
                modelComplexity: 0
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
                        this.mediapipeListener_?.onResult(result)
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
