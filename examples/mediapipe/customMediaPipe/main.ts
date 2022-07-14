import CameraSource from '../../common/js/camera-source'
import { getVonageEventEmitter, isSupported, MediaPipeModelType } from '@vonage/ml-transformers'
import {setVonageMetadata, MediaProcessorConnectorInterface, MediaProcessorConnector} from '@vonage/media-processor'
import MediaProcessorHelperMain from './js/MediaProcessorHelperMain'
import MediaProcessorHelperWorker from './js/MediaProcessorHelperWorker'
import { MediapipeMediaProcessorInterface } from './js/MediapipeInterfaces';

async function main() {
  try {
    await isSupported();
  } catch(e) {
    alert('Something bad happened: ' + e);
  }

  const cameraswitchSelector: any = document.getElementById('cameraswitch')
  const typeSelector: any = document.getElementById('typeSelector')
  const processSelector: any = document.getElementById('processSelector')
  const githubButtonSelector: HTMLElement | null = document.getElementById("githubButton")
  const vividButtonSelector: HTMLElement | null = document.getElementById("vividButton")

  let videoSource_: CameraSource = new CameraSource()
  await videoSource_.init().catch(e => {
    alert('error initing camera, ' + e )
    return
  })

  async function updateCameraSwitch(isChecked: boolean) {
    const mediapipeType = typeSelector.value
    const processType = processSelector.value
    
    if(!isChecked){
      typeSelector.disabled = false
      processSelector.disabled = false
      await videoSource_.stopMediaProcessorConnector()
    }else{
      if(mediapipeType === 'Choose_an_item' || processType === 'Choose_an_item'){
        alert('Please select MediaPipe module and process')
        cameraswitchSelector.checked = false
        return
      }
      typeSelector.disabled = true
      processSelector.disabled = true
      setVonageMetadata({appId: 'MediaPipe Demo', sourceType: 'test'})
      let processor: MediapipeMediaProcessorInterface
      
      if(processType === 'main'){
        processor = new MediaProcessorHelperMain()
      } else {
        processor = new MediaProcessorHelperWorker()
      }

      processor.init(mediapipeType as MediaPipeModelType).then( () => {
        const connector: MediaProcessorConnectorInterface = new MediaProcessorConnector(processor)
        
        processor.getEventEmitter().on('error', (e => {
          console.error(e)
        }))
        processor.getEventEmitter().on('pipelineInfo', (i => {
          console.info(i)
        }))
        processor.getEventEmitter().on('warn', (w => {
          console.warn(w)
        }))

        videoSource_.setMediaProcessorConnector(connector).catch(e => {
          throw e
        })
      })
      
    }
  }
  cameraswitchSelector.addEventListener('change', (event: any) => {
    updateCameraSwitch(event.target.checked); 
  })
  
  if(githubButtonSelector){
    githubButtonSelector.addEventListener('click', () => {
      window.open("https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/mediapipe/customMediaPipe", '_blank')?.focus();
    })
  }

  if(vividButtonSelector){
    vividButtonSelector.addEventListener('click', () => {
      window.open("https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid", '_blank')?.focus();
    })
  }

  cameraswitchSelector.disabled = true
  cameraswitchSelector.addEventListener('mouseenter', () => {
    if(cameraswitchSelector.disabled){
      var snackbar: any = document.getElementById("disabledHover")
      if(snackbar){
        snackbar.show()
      }
    }
  })

  function checkEnableCameraSwitch(){
    const mediapipeType = typeSelector.value
    const processType = processSelector.value
    if(mediapipeType != 'Choose_an_item' && processType != 'Choose_an_item'){
      var snackbar: any = document.getElementById("disabledHover")
      if(snackbar){
        snackbar.close()
      }
      cameraswitchSelector.disabled = false
    }else{
      cameraswitchSelector.disabled = true
    }
  }

  typeSelector.addEventListener('change', () => {
    checkEnableCameraSwitch()
  })

  processSelector.addEventListener('change', () => {
    checkEnableCameraSwitch()
  })

}

window.onload = main;

