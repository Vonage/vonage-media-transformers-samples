
import {MediaProcessor, EventDataMap} from '@vonage/media-processor'
import {MediaPipeModelType, MediaPipeResults, SelfieSegmentationResults} from '@vonage/ml-transformers'
import Emittery from 'emittery'
import { MediapipeMediaProcessorInterface, MediapipeResultsListnerInterface } from './MediapipeInterfaces'
import MediapipeObject from './MediapipeObject'
import MediapipeTransformer from './mediapipeTransformer'

class MediaProcessorHelperMain implements MediapipeMediaProcessorInterface, MediapipeResultsListnerInterface{
    mediaProcessor_: MediaProcessor
    mediaipeTransformer_: MediapipeTransformer
    mediapipe_: MediapipeObject
    modelType_?: MediaPipeModelType

    constructor(){
        this.mediaProcessor_ = new MediaProcessor()
        this.mediaipeTransformer_ = new MediapipeTransformer()
        this.mediapipe_ = new MediapipeObject()
        this.mediaipeTransformer_.setMediapipeConsts(this.mediapipe_.getMediapipeConsts())
    }

    onResult(result: MediaPipeResults): void {
        if(this.modelType_ === 'selfie_segmentation'){
            let selfieResult = result as SelfieSegmentationResults
            this.mediaipeTransformer_.onResult(selfieResult.segmentationMask as ImageBitmap)
        }else{
            this.mediaipeTransformer_.onResult(result)
        }
    }

    init(modelType: MediaPipeModelType): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.modelType_ = modelType
            this.mediapipe_.init(modelType, this).then(() =>{
                this.mediaipeTransformer_.init(modelType, this.mediapipe_).then( () =>{
                    this.mediaProcessor_.setTransformers([this.mediaipeTransformer_]).then(() => {
                        resolve()
                    }).catch(e => {
                        reject(e)
                    })
                }).catch(e => {
                    reject(e)
                })
            }).catch(e => {
                reject(e)
            })
            
        })
    }

    transform(readable: ReadableStream<any>, writable: WritableStream<any>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.mediaProcessor_.transform(readable, writable).then( () => {
                resolve()
            }).catch(e => {
                reject(e)
            })
        })
    }

    destroy(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.mediaProcessor_.destroy().then(() => {
                this.mediapipe_.mediapipeHelper_?.close().then( () => {
                    resolve()
                }).catch(e => {
                    reject(e)
                })
            }).catch(e => {
                reject(e)
            })
        })
    }

    getEventEmitter(): Emittery<EventDataMap>{
        return this.mediaProcessor_
    }
}

export default MediaProcessorHelperMain