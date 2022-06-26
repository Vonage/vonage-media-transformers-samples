import {drawRectangle, drawConnectors, drawLandmarks, lerp, clamp, LandmarkConnectionArray} from '@mediapipe/drawing_utils'
import { FACEMESH_LIPS, 
    FACEMESH_LEFT_EYE,
    FACEMESH_LEFT_EYEBROW, 
    FACEMESH_LEFT_IRIS,
    FACEMESH_RIGHT_EYE, 
    FACEMESH_RIGHT_EYEBROW, 
    FACEMESH_RIGHT_IRIS,
    FACEMESH_FACE_OVAL, 
    FACEMESH_CONTOURS,
    FACEMESH_TESSELATION,  
     } from '@mediapipe/face_mesh'
import {HAND_CONNECTIONS} from '@mediapipe/hands'
import {POSE_LANDMARKS, POSE_CONNECTIONS , POSE_LANDMARKS_LEFT , POSE_LANDMARKS_RIGHT, POSE_LANDMARKS_NEUTRAL } from '@mediapipe/holistic'
import {BOX_CONNECTIONS, BOX_KEYPOINTS} from '@mediapipe/objectron'

declare global{
    var drawRectangle: Function
    var drawConnectors: Function
    var drawLandmarks: Function
    var lerp: Function
    var clamp: Function
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
    var HAND_CONNECTIONS: LandmarkConnectionArray
    var POSE_LANDMARKS: object
    var POSE_CONNECTIONS: LandmarkConnectionArray
    var POSE_LANDMARKS_LEFT: object
    var POSE_LANDMARKS_RIGHT: object
    var POSE_LANDMARKS_NEUTRAL: object
    var BOX_CONNECTIONS: LandmarkConnectionArray
    var BOX_KEYPOINTS: object
}
if(!globalThis.drawRectangle){
    globalThis.drawRectangle = drawRectangle
}

if(!globalThis.drawConnectors){
    globalThis.drawConnectors = drawConnectors
}

if(!globalThis.drawLandmarks){
    globalThis.drawLandmarks = drawLandmarks
}

if(!globalThis.lerp){
    globalThis.lerp = lerp
}

if(!globalThis.clamp){
    globalThis.clamp = clamp
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
if(!globalThis.HAND_CONNECTIONS){
    globalThis.HAND_CONNECTIONS = HAND_CONNECTIONS
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

if(!globalThis.BOX_CONNECTIONS){
    globalThis.BOX_CONNECTIONS = BOX_CONNECTIONS
}

if(!globalThis.BOX_KEYPOINTS){
    globalThis.BOX_KEYPOINTS = BOX_KEYPOINTS
}