import '@mediapipe/face_mesh'
import { LandmarkConnectionArray } from '@mediapipe/drawing_utils'
import { MediaPipeFullResults } from './MediapipeInterfaces'
import { FaceMeshResults } from '@vonage/ml-transformers'
import './DrawingUtilsHelper'
     
declare global{
    var FACEMESH_LIPS: LandmarkConnectionArray
    var FACEMESH_TESSELATION: LandmarkConnectionArray
    var FACEMESH_RIGHT_EYE: LandmarkConnectionArray
    var FACEMESH_LEFT_EYE: LandmarkConnectionArray
    var FACEMESH_RIGHT_EYEBROW:LandmarkConnectionArray
    var FACEMESH_LEFT_EYEBROW: LandmarkConnectionArray
    var FACEMESH_FACE_OVAL: LandmarkConnectionArray
    var FACEMESH_LEFT_IRIS: LandmarkConnectionArray
    var FACEMESH_RIGHT_IRIS: LandmarkConnectionArray
    var FACEMESH_CONTOURS: LandmarkConnectionArray
}

if(!globalThis.FACEMESH_LIPS){
    globalThis.FACEMESH_LIPS = FACEMESH_LIPS
}

if(!globalThis.FACEMESH_TESSELATION){
    globalThis.FACEMESH_TESSELATION = FACEMESH_TESSELATION
}

if(!globalThis.FACEMESH_RIGHT_EYE){
    globalThis.FACEMESH_RIGHT_EYE = FACEMESH_RIGHT_EYE
}

if(!globalThis.FACEMESH_LEFT_EYE){
    globalThis.FACEMESH_LEFT_EYE = FACEMESH_LEFT_EYE
}

if(!globalThis.FACEMESH_RIGHT_EYEBROW){
    globalThis.FACEMESH_RIGHT_EYEBROW = FACEMESH_RIGHT_EYEBROW
}

if(!globalThis.FACEMESH_LEFT_EYEBROW){
    globalThis.FACEMESH_LEFT_EYEBROW = FACEMESH_LEFT_EYEBROW
}

if(!globalThis.FACEMESH_FACE_OVAL){
    globalThis.FACEMESH_FACE_OVAL = FACEMESH_FACE_OVAL
}

if(!globalThis.FACEMESH_RIGHT_IRIS){
    globalThis.FACEMESH_RIGHT_IRIS = FACEMESH_RIGHT_IRIS
}

if(!globalThis.FACEMESH_LEFT_IRIS){
    globalThis.FACEMESH_LEFT_IRIS = FACEMESH_LEFT_IRIS
}

if(!globalThis.FACEMESH_RIGHT_IRIS){
    globalThis.FACEMESH_RIGHT_IRIS = FACEMESH_RIGHT_IRIS
}

if(!globalThis.FACEMESH_CONTOURS){
    globalThis.FACEMESH_CONTOURS = FACEMESH_CONTOURS
}

export interface FacemashExtras{
    FACEMESH_LIPS: LandmarkConnectionArray,
    FACEMESH_TESSELATION: LandmarkConnectionArray,
    FACEMESH_RIGHT_EYE: LandmarkConnectionArray,
    FACEMESH_LEFT_EYE: LandmarkConnectionArray,
    FACEMESH_RIGHT_EYEBROW:LandmarkConnectionArray,
    FACEMESH_LEFT_EYEBROW: LandmarkConnectionArray,
    FACEMESH_FACE_OVAL: LandmarkConnectionArray,
    FACEMESH_LEFT_IRIS: LandmarkConnectionArray,
    FACEMESH_RIGHT_IRIS: LandmarkConnectionArray,
    FACEMESH_CONTOURS: LandmarkConnectionArray,
}

export function FacemashExtras(): FacemashExtras{
    
    let extras: FacemashExtras = {
        FACEMESH_LIPS: globalThis.FACEMESH_LIPS,
        FACEMESH_TESSELATION: globalThis.FACEMESH_TESSELATION,
        FACEMESH_RIGHT_EYE: globalThis.FACEMESH_RIGHT_EYE,
        FACEMESH_LEFT_EYE: globalThis.FACEMESH_LEFT_EYE,
        FACEMESH_RIGHT_EYEBROW: globalThis.FACEMESH_RIGHT_EYEBROW,
        FACEMESH_LEFT_EYEBROW: globalThis.FACEMESH_LEFT_EYEBROW,
        FACEMESH_FACE_OVAL: globalThis.FACEMESH_FACE_OVAL,
        FACEMESH_LEFT_IRIS: globalThis.FACEMESH_LEFT_IRIS,
        FACEMESH_RIGHT_IRIS: globalThis.FACEMESH_RIGHT_IRIS,
        FACEMESH_CONTOURS: globalThis.FACEMESH_CONTOURS
    }
    return extras
}