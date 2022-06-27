
import {MediaPipeModelType, MediaPipeResults} from "@vonage/ml-transformers"
import {MediaProcessorInterface} from '@vonage/media-processor'
import {FacemashExtras} from './FacemashHelper'
import {HandsExtras} from './HandsHelper'
import { HolisticExrtas } from "./HolisticHelper"
import { ObjectronExtras } from "./ObjectronHelper"

export interface MediaPipeFullResults {
    mediaPipeResults: MediaPipeResults 
    facemashExtras?: FacemashExtras
    handsExtras?: HandsExtras
    holisticExrtas?: HolisticExrtas
    objectronExtras?: ObjectronExtras
}

export interface MediapipeMediaProcessorInterface extends MediaProcessorInterface{
    init(modelType: MediaPipeModelType): Promise<void>
}

export interface MediapipeResultsListnerInterface{
    onResult(result: MediaPipeFullResults): void
}

export interface MediapipePorcessInterface{
    onSend(data: ImageBitmap): Promise<void>
}