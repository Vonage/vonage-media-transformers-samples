import CameraSource from '../../common/js/camera-source'
import { isSupported, MediaPipeModelType } from '@vonage/ml-transformers'
import {setVonageMetadata, MediaProcessorConnectorInterface, MediaProcessorConnector} from '@vonage/media-processor'
import MediaProcessorHelperMain from './js/MediaProcessorHelperMain'
import MediaProcessorHelperWorker from './js/MediaProcessorHelperWorker'
import { MediapipeMediaProcessorInterface } from './js/MediapipeInterfaces';

async function main() {
  try {
    await isSupported();
  } catch(e) {
    throw('Something bad happened: ' + e);
  }

  const sourceSelector: any =document.getElementById('sourceSelector')
  const typeSelector: any = document.getElementById('typeSelector')
  const processSelector: any = document.getElementById('processSelector')

  let videoSource_: CameraSource = new CameraSource()

  async function updatePipelineSource() {
    const sourceType = sourceSelector.options[sourceSelector.selectedIndex].value
    const mediapipeType = typeSelector.options[typeSelector.selectedIndex].value
    const processType = processSelector.options[processSelector.selectedIndex].value

    setVonageMetadata({appId: '123', sourceType: 'test'})
    
    if(sourceType === 'stop'){
      await videoSource_.stopMediaProcessorConnector()
    }else if(sourceType === 'camera'){
      let processor: MediapipeMediaProcessorInterface
      
      if(processType === 'main'){
        processor = new MediaProcessorHelperMain()
      } else if(processType === 'worker') {
        processor = new MediaProcessorHelperWorker()
      } else {
        throw "process is not supported"
      }

      processor.init(mediapipeType as MediaPipeModelType).then( () => {
        const connector: MediaProcessorConnectorInterface = new MediaProcessorConnector(processor)
        videoSource_.setMediaProcessorConnector(connector).catch(e => {
          throw e
        })
      })
      
    }
  }
  sourceSelector.oninput = updatePipelineSource;
  sourceSelector.disabled = false;
}

window.onload = main;

