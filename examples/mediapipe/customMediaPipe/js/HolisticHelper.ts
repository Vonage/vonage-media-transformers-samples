import '@mediapipe/holistic'
import { LandmarkConnectionArray, NormalizedLandmark, Data } from '@mediapipe/drawing_utils'
import { MediaPipeFullResults } from './MediapipeInterfaces'
import { HolisticResults } from '@vonage/ml-transformers'

declare global{
    var POSE_LANDMARKS: any
    var POSE_CONNECTIONS: LandmarkConnectionArray
    var POSE_LANDMARKS_LEFT: any
    var POSE_LANDMARKS_RIGHT: any
    var POSE_LANDMARKS_NEUTRAL: any
    var HAND_CONNECTIONS: LandmarkConnectionArray
}

if(!globalThis.POSE_LANDMARKS){
    globalThis.POSE_LANDMARKS = POSE_LANDMARKS
}

if(!globalThis.POSE_CONNECTIONS){
    globalThis.POSE_CONNECTIONS = POSE_CONNECTIONS
}

if(!globalThis.POSE_LANDMARKS_LEFT){
    globalThis.POSE_LANDMARKS_LEFT = POSE_LANDMARKS_LEFT
}

if(!globalThis.POSE_LANDMARKS_RIGHT){
    globalThis.POSE_LANDMARKS_RIGHT = POSE_LANDMARKS_RIGHT
}

if(!globalThis.POSE_LANDMARKS_NEUTRAL){
    globalThis.POSE_LANDMARKS_NEUTRAL = POSE_LANDMARKS_NEUTRAL
}

if(!globalThis.HAND_CONNECTIONS){
    globalThis.HAND_CONNECTIONS = HAND_CONNECTIONS
}

export interface HolisticExrtas {
    POSE_LANDMARKS: any
    POSE_CONNECTIONS: LandmarkConnectionArray
    POSE_LANDMARKS_LEFT: any
    POSE_LANDMARKS_RIGHT: any
    POSE_LANDMARKS_NEUTRAL: any
    HAND_CONNECTIONS: LandmarkConnectionArray
}

export function HolisticExrtas(): HolisticExrtas{
    let extras: HolisticExrtas = {
        POSE_LANDMARKS: globalThis.POSE_LANDMARKS,
        POSE_CONNECTIONS: globalThis.POSE_CONNECTIONS,
        POSE_LANDMARKS_LEFT: globalThis.POSE_LANDMARKS_LEFT,
        POSE_LANDMARKS_RIGHT: globalThis.POSE_LANDMARKS_RIGHT,
        POSE_LANDMARKS_NEUTRAL: globalThis.POSE_LANDMARKS_NEUTRAL,
        HAND_CONNECTIONS: globalThis.HAND_CONNECTIONS
    }
    return extras
}