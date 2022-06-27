import '@mediapipe/hands'
import { LandmarkConnectionArray, Data } from '@mediapipe/drawing_utils'
import { MediaPipeFullResults } from './MediapipeInterfaces'
import { HandsResults } from '@vonage/ml-transformers'

declare global{
    var HAND_CONNECTIONS: LandmarkConnectionArray
}

if(!globalThis.HAND_CONNECTIONS){
    globalThis.HAND_CONNECTIONS = HAND_CONNECTIONS
}

export interface HandsExtras {
    HAND_CONNECTIONS: LandmarkConnectionArray
}

export function HandsExtras(): HandsExtras{
    let extras: HandsExtras = {
        HAND_CONNECTIONS: globalThis.HAND_CONNECTIONS
    }
    return extras
}