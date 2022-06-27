import {BOX_CONNECTIONS, BOX_KEYPOINTS} from '@mediapipe/objectron'
import { LandmarkConnectionArray } from '@mediapipe/drawing_utils'
import { MediaPipeFullResults } from './MediapipeInterfaces'
import { ObjectronResults } from '@vonage/ml-transformers'

declare global{
    var BOX_CONNECTIONS: LandmarkConnectionArray
    var BOX_KEYPOINTS: any
}

export interface ObjectronExtras {
    BOX_CONNECTIONS: LandmarkConnectionArray
    BOX_KEYPOINTS: any
}

export function ObjectronExtras(): ObjectronExtras{
    let extras: ObjectronExtras = {
        BOX_CONNECTIONS: globalThis.BOX_CONNECTIONS,
        BOX_KEYPOINTS: globalThis.BOX_KEYPOINTS
    }
    return extras
}