
import {MediaPipeModelType, MediaPipeResults} from "@vonage/ml-transformers"
import {MediaProcessorInterface} from '@vonage/media-processor'

export interface MediaPipeFullResults {
    mediaPipeResults: MediaPipeResults 
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