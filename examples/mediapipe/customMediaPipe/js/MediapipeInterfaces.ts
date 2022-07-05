
import {MediaPipeModelType, MediaPipeResults} from "@vonage/ml-transformers"
import {MediaProcessorInterface, EventDataMap} from '@vonage/media-processor'
import Emittery from 'emittery'

export interface FaceDetectionConsts {
    FACEDETECTION_LIPS: any
    FACEDETECTION_LEFT_EYE: any
    FACEDETECTION_LEFT_EYEBROW: any
    FACEDETECTION_RIGHT_EYE: any
    FACEDETECTION_RIGHT_EYEBROW: any
    FACEDETECTION_FACE_OVAL: any
    FACEDETECTION_CONTOURS: any
    FACEDETECTION_TESSELATION: any
}

export interface FaceMashConsts {
    FACE_GEOMETRY: any
    FACEMESH_LIPS: any
    FACEMESH_LEFT_EYE: any
    FACEMESH_LEFT_EYEBROW: any
    FACEMESH_LEFT_IRIS: any
    FACEMESH_RIGHT_EYE: any
    FACEMESH_RIGHT_EYEBROW: any
    FACEMESH_RIGHT_IRIS: any
    FACEMESH_FACE_OVAL: any
    FACEMESH_CONTOURS: any
    FACEMESH_TESSELATION: any
}

export interface HolisticConsts {
    FACE_GEOMETRY: any
    FACEMESH_LIPS: any
    FACEMESH_LEFT_EYE: any
    FACEMESH_LEFT_EYEBROW: any
    FACEMESH_LEFT_IRIS: any
    FACEMESH_RIGHT_EYE: any
    FACEMESH_RIGHT_EYEBROW: any
    FACEMESH_RIGHT_IRIS: any
    FACEMESH_FACE_OVAL: any
    FACEMESH_CONTOURS: any
    FACEMESH_TESSELATION: any
    HAND_CONNECTIONS: any
    POSE_CONNECTIONS: any
    POSE_LANDMARKS: any
    POSE_LANDMARKS_LEFT: any
    POSE_LANDMARKS_RIGHT: any
    POSE_LANDMARKS_NEUTRAL: any
}

export interface HandsConsts {
    HAND_CONNECTIONS: any
}

export interface ObjectronConsts {
    BOX_CONNECTIONS: any
    BOX_KEYPOINTS: any
}

export interface PoseConsts {
    POSE_CONNECTIONS: any
    POSE_LANDMARKS: any
    POSE_LANDMARKS_LEFT: any
    POSE_LANDMARKS_RIGHT: any
    POSE_LANDMARKS_NEUTRAL: any
}

export interface MediapipeConsts {
    facedetection: FaceDetectionConsts
    facemash: FaceMashConsts
    holistic: HolisticConsts
    hands: HandsConsts
    objectron: ObjectronConsts
    pose: PoseConsts
}


export interface MediapipeMediaProcessorInterface extends MediaProcessorInterface {
    init(modelType: MediaPipeModelType): Promise<void>
    getEventEmitter(): Emittery<EventDataMap>
}

export interface MediapipeResultsListnerInterface{
    onResult(result: MediaPipeResults): void
}

export interface MediapipePorcessInterface{
    onSend(data: ImageBitmap): Promise<void>
}