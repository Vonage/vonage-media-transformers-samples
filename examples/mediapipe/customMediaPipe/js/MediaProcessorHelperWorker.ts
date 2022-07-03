// @ts-ignore
import TheWorker from './MediaProcessorHelperThread?worker&inline'

import { MediaPipeModelType, SelfieSegmentationResults } from '@vonage/ml-transformers';
import { MediapipeMediaProcessorInterface, MediapipeResultsListnerInterface, MediaPipeFullResults } from './MediapipeInterfaces';
import {getVonageMetadata, EventDataMap, PipelineInfoData} from '@vonage/media-processor'
import MediapipeObject from './MediapipeObject';
import Emittery from 'emittery' 

class MediaProcessorHelperWorker implements MediapipeMediaProcessorInterface, MediapipeResultsListnerInterface {
    worker_: any
    mediapipe_: MediapipeObject
    innerEmittery_: Emittery
    modelType_?: MediaPipeModelType
    processorEmittery_: Emittery<EventDataMap>

    constructor() {
        this.worker_ = new TheWorker()
        this.mediapipe_ = new MediapipeObject()
        this.innerEmittery_ = new Emittery()
        this.processorEmittery_ = new Emittery()
    }

    onResult(result: MediaPipeFullResults): void {
        if(this.modelType_ === 'selfie_segmentation'){
            let selfieResult = result.mediaPipeResults as SelfieSegmentationResults
            this.worker_.postMessage({
                operation: 'onResults',
                info: selfieResult.segmentationMask
            }, [selfieResult.segmentationMask])
        }else{

            this.worker_.postMessage({
                operation: 'onResults',
                info: JSON.stringify(result)
            })
        }
    }

    private handleWorkerEvent(msg: any){
        if(msg.data){
            if(msg.data.operation === 'init'){
                this.innerEmittery_.emit('init', msg.data)
            } else if(msg.data.operation === 'transform'){
                this.innerEmittery_.emit('transform', msg.data)
            } else if(msg.data.operation === 'destroy'){
                this.innerEmittery_.emit('destroy', msg.data)
            } else if(msg.data.operation === 'send'){
                this.mediapipe_.onSend(msg.data.info)
            } else if(msg.data.operation === 'mediaProcessor'){
                if(msg.data.type === 'error'){
                    this.processorEmittery_.emit('error', msg.data.info)
                } else if(msg.data.type === 'pipelineInfo'){
                    let info: PipelineInfoData = msg.data.info
                    if(info.message === 'pipeline_ended' || info.message === 'pipeline_ended_with_error'){
                        this.worker_.terminate()
                    }
                    this.processorEmittery_.emit('pipelineInfo', msg.data.info)
                } else if(msg.data.type === 'error'){
                    this.processorEmittery_.emit('warn', msg.data.info)
                }
            }
        }
    }

    init(modelType: MediaPipeModelType): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.modelType_ = modelType
            this.worker_.addEventListener('message', ((msg: any) => {
                this.handleWorkerEvent(msg)
            }))
            
            let metaData: String = JSON.stringify(getVonageMetadata())
            if(typeof metaData != 'string'){
                metaData = JSON.stringify({})
            }

            this.mediapipe_.init(modelType, this).then( () => {
                this.worker_.postMessage({
                    operation: 'init',
                    modelType: modelType, 
                    metaData: metaData
                })
            })
            this.innerEmittery_.once('init').then( data => {
                if(data.info === 'success'){
                    resolve()
                }else {
                    reject(data.error)
                }
            })
        })
    }

    transform(readable: ReadableStream<any>, writable: WritableStream<any>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.worker_.postMessage({
                operation: 'transform',
                readable: readable, 
                writable: writable
            }, [readable, writable])
            this.innerEmittery_.once('transform').then( data => {
                if(data.info === 'success'){
                    resolve()
                }else {
                    reject(data.error)
                }
            })
        })
        
    }

    destroy(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.worker_.postMessage({
                operation: 'destroy'
            })
            this.innerEmittery_.once('destroy').then( data => {
                if(data.info === 'success'){
                    this.mediapipe_.mediapipeHelper_?.close().then( () => {
                        resolve()
                    }).catch(e => {
                        reject(e)
                    })
                }else {
                    reject(data.error)
                }
            })
        })
    }

    getEventEmitter(): Emittery<EventDataMap>{
        return this.processorEmittery_
    }

}
export default MediaProcessorHelperWorker