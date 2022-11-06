
import {MediaPipeModelType, MediaPipeResults} from "@vonage/ml-transformers"
import {MediaProcessorInterface, EventDataMap} from '@vonage/media-processor'
import Emittery from 'emittery'

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