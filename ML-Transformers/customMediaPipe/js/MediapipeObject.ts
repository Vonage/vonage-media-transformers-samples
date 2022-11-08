import { MediapipeHelper, MediaPipeModelType, MediapipeConfig, MediaPipeResults, FaceDetectionOptions, FaceMeshOptions, HandsOptions, HolisticOptions, ObjectronOptions, SelfieSegmentationOptions, PoseOptions } from "@vonage/ml-transformers"
import { MediapipePorcessInterface, MediapipeResultsListnerInterface, MediapipeConsts } from "./MediapipeInterfaces"
import {getVonageFaceMash, getVonageHands, getVonageHolistic, getVonageObjectron, getVonagePose, getVonageFaceDetection} from '@vonage/ml-transformers'

class MediapipeObject implements MediapipePorcessInterface{
    mediapipeHelper_?: MediapipeHelper
    mediapipeListener_?: MediapipeResultsListnerInterface

    constructor(){
        
    }

    getMediapipeConsts(): MediapipeConsts {
        let ret: MediapipeConsts = {
            facedetection: {
                FACEDETECTION_LIPS: getVonageFaceDetection().FACEDETECTION_LIPS,
                FACEDETECTION_LEFT_EYE: getVonageFaceDetection().FACEDETECTION_LEFT_EYE,
                FACEDETECTION_LEFT_EYEBROW: getVonageFaceDetection().FACEDETECTION_LEFT_EYEBROW,
                FACEDETECTION_RIGHT_EYE: getVonageFaceDetection().FACEDETECTION_RIGHT_EYE,
                FACEDETECTION_RIGHT_EYEBROW: getVonageFaceDetection().FACEDETECTION_RIGHT_EYEBROW,
                FACEDETECTION_FACE_OVAL: getVonageFaceDetection().FACEDETECTION_FACE_OVAL,
                FACEDETECTION_CONTOURS: getVonageFaceDetection().FACEDETECTION_CONTOURS,
                FACEDETECTION_TESSELATION: getVonageFaceDetection().FACEDETECTION_TESSELATION
            },
            facemash: {
                FACE_GEOMETRY: getVonageFaceMash().FACE_GEOMETRY,
                FACEMESH_LIPS: getVonageFaceMash().FACEMESH_LIPS,
                FACEMESH_LEFT_EYE: getVonageFaceMash().FACEMESH_LEFT_EYE,
                FACEMESH_LEFT_EYEBROW: getVonageFaceMash().FACEMESH_LEFT_EYEBROW,
                FACEMESH_LEFT_IRIS: getVonageFaceMash().FACEMESH_LEFT_IRIS,
                FACEMESH_RIGHT_EYE: getVonageFaceMash().FACEMESH_RIGHT_EYE,
                FACEMESH_RIGHT_EYEBROW: getVonageFaceMash().FACEMESH_RIGHT_EYEBROW,
                FACEMESH_RIGHT_IRIS: getVonageFaceMash().FACEMESH_RIGHT_IRIS,
                FACEMESH_FACE_OVAL: getVonageFaceMash().FACEMESH_FACE_OVAL,
                FACEMESH_CONTOURS: getVonageFaceMash().FACEMESH_CONTOURS,
                FACEMESH_TESSELATION: getVonageFaceMash().FACEMESH_TESSELATION
            },
            holistic: {
                FACE_GEOMETRY: getVonageHolistic().FACE_GEOMETRY,
                FACEMESH_LIPS: getVonageHolistic().FACEMESH_LIPS,
                FACEMESH_LEFT_EYE: getVonageHolistic().FACEMESH_LEFT_EYE,
                FACEMESH_LEFT_EYEBROW: getVonageHolistic().FACEMESH_LEFT_EYEBROW,
                FACEMESH_LEFT_IRIS: getVonageHolistic().FACEMESH_LEFT_IRIS,
                FACEMESH_RIGHT_EYE: getVonageHolistic().FACEMESH_RIGHT_EYE,
                FACEMESH_RIGHT_EYEBROW: getVonageHolistic().FACEMESH_RIGHT_EYEBROW,
                FACEMESH_RIGHT_IRIS: getVonageHolistic().FACEMESH_RIGHT_IRIS,
                FACEMESH_FACE_OVAL: getVonageHolistic().FACEMESH_FACE_OVAL,
                FACEMESH_CONTOURS: getVonageHolistic().FACEMESH_CONTOURS,
                FACEMESH_TESSELATION: getVonageHolistic().FACEMESH_TESSELATION,
                HAND_CONNECTIONS: getVonageHolistic().HAND_CONNECTIONS,
                POSE_CONNECTIONS: getVonageHolistic().POSE_CONNECTIONS,
                POSE_LANDMARKS: getVonageHolistic().POSE_LANDMARKS,
                POSE_LANDMARKS_LEFT: getVonageHolistic().POSE_LANDMARKS_LEFT,
                POSE_LANDMARKS_RIGHT: getVonageHolistic().POSE_LANDMARKS_RIGHT,
                POSE_LANDMARKS_NEUTRAL: getVonageHolistic().POSE_LANDMARKS_NEUTRAL
            },
            hands: {
                HAND_CONNECTIONS: getVonageHands().HAND_CONNECTIONS
            },
            objectron: {
                BOX_CONNECTIONS: getVonageObjectron().BOX_CONNECTIONS,
                BOX_KEYPOINTS: getVonageObjectron().BOX_KEYPOINTS
            },
            pose: {
                POSE_CONNECTIONS: getVonagePose().POSE_CONNECTIONS,
                POSE_LANDMARKS: getVonagePose().POSE_LANDMARKS,
                POSE_LANDMARKS_LEFT: getVonagePose().POSE_LANDMARKS_LEFT,
                POSE_LANDMARKS_RIGHT: getVonagePose().POSE_LANDMARKS_RIGHT,
                POSE_LANDMARKS_NEUTRAL: getVonagePose().POSE_LANDMARKS_NEUTRAL
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
