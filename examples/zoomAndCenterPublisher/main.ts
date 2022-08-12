// @ts-ignore
import TheWorker from './js/MediaProcessorHelperThread?worker&inline'
import CameraSource from '../common/js/camera-source'
import { isSupported, MediaPipeModelType, MediaPipeResults, MediapipeConfig, MediapipeHelper, FaceDetectionOptions } from '@vonage/ml-transformers'
import {setVonageMetadata, MediaProcessorConnectorInterface, MediaProcessorConnector, getVonageMetadata, PipelineInfoData, EventDataMap} from '@vonage/media-processor'
import Emittery from 'emittery' 

interface VideoInfo {
  width: number
  height: number
  frameRate: number
}

async function main() {
  try {
    await isSupported();
  } catch(e) {
    alert('Something bad happened: ' + e);
  }

  const githubButtonSelector: HTMLElement | null = document.getElementById("githubButton")
  const vividButtonSelector: HTMLElement | null = document.getElementById("vividButton")

  const modelType: MediaPipeModelType = "face_detection"
  const modelOptions: FaceDetectionOptions = {
      selfieMode: false,
      minDetectionConfidence: 0.5,
      model: 'short'
  }
  const mediaHelper = new MediapipeHelper()
  const worker = new TheWorker();

  let videoSource_: CameraSource = new CameraSource()
  let innerEmittery: Emittery = new Emittery();
  let processorEmittery: Emittery<EventDataMap> = new Emittery();
  let videoInfo: VideoInfo;

  await videoSource_.init().then(() => {
    // @ts-ignore
    const {width, height, frameRate} = videoSource_.videoTrack_?.getSettings();
    videoInfo = {
      width,
      height,
      frameRate
    }
    setMediaProcessor();
  }).catch(e => {
    alert('error initing camera, ' + e )
    return
  })

  async function setMediaProcessor() {
    await initializeMediaPipe();
    const connector: MediaProcessorConnectorInterface = new MediaProcessorConnector({transform, destroy})
    
    videoSource_.setMediaProcessorConnector(connector).catch(e => {
      throw e
    })
  }
  

  async function initializeMediaPipe() {
      return new Promise<void>((resolve, reject) => {
          worker.addEventListener('message', ((msg: any) => {
              handleWorkerEvent(msg)
          }))
          let metaData: String = JSON.stringify(getVonageMetadata())

          if(typeof metaData != 'string'){
              metaData = JSON.stringify({})
          }

          let config: MediapipeConfig = {
              mediaPipeModelConfigArray:[{
                  listener: (result: MediaPipeResults) : void => {
                      onResult(result)
                  },
                  modelType: modelType,
                  options: modelOptions
              }]
          }
          mediaHelper.initialize(config).then( () => {
            worker.postMessage({
              operation: 'init',
              modelType: modelType, 
              metaData: metaData,
              videoInfo: videoInfo
            })
          })

          innerEmittery.once('init').then( data => {
              if(data.info === 'success'){
                  resolve()
              }else {
                  reject(data.error)
              }
          })
      })
  }

  function transform(readable: ReadableStream<any>, writable: WritableStream<any>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        worker.postMessage({
            operation: 'transform',
            readable: readable, 
            writable: writable
        }, [readable, writable])
        innerEmittery.once('transform').then( data => {
            if(data.info === 'success'){
                resolve()
            }else {
                reject(data.error)
            }
        })
    })
    
  }

  function destroy(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        worker.postMessage({
            operation: 'destroy'
        })
        innerEmittery.once('destroy').then( data => {
            if(data.info === 'success'){
                mediaHelper.close().then( () => {
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

  function onResult(result: MediaPipeResults) {
    worker.postMessage({
      operation: 'onResults',
      info: JSON.stringify(result)
    })
  }

  function onSend(data: ImageBitmap): Promise<void> {
    return new Promise<void>((resolve, reject) => {            
      mediaHelper.send(data).then( () => {
            resolve()
        }).catch(e => {
            reject(e)
        })
    })
  }

  function handleWorkerEvent(msg: any) {
    if(msg.data){
      if(msg.data.operation === 'init'){
          innerEmittery.emit('init', msg.data)
      } else if(msg.data.operation === 'transform'){
          innerEmittery.emit('transform', msg.data)
      } else if(msg.data.operation === 'destroy'){
          innerEmittery.emit('destroy', msg.data)
      } else if(msg.data.operation === 'send'){
          onSend(msg.data.info)
      } else if(msg.data.operation === 'mediaProcessor'){
          if(msg.data.type === 'error'){
              processorEmittery.emit('error', msg.data.info)
          } else if(msg.data.type === 'pipelineInfo'){
              let info: PipelineInfoData = msg.data.info
              if(info.message === 'pipeline_ended' || info.message === 'pipeline_ended_with_error'){
                  worker.terminate()
              }
              processorEmittery.emit('pipelineInfo', msg.data.info)
          } else if(msg.data.type === 'error'){
              processorEmittery.emit('warn', msg.data.info)
          }
      }
   }
  }

  if(githubButtonSelector){
    githubButtonSelector.addEventListener('click', () => {
      window.open("https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/mediapipe/zoomAndCenterPublisher", '_blank')?.focus();
    })
  }

  if(vividButtonSelector){
    vividButtonSelector.addEventListener('click', () => {
      window.open("https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid", '_blank')?.focus();
    })
  }

}

window.onload = main;