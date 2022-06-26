import CameraSource from '../../common/js/camera-source'
import { isSupported } from '@vonage/ml-transformers'
import {MediaProcessor, MediaProcessorConnector, setVonageMetadata} from '@vonage/media-processor'
import MediapipeTransformer from './js/mediapipeTransformer';

async function main() {
  try {
    await isSupported();
  } catch(e) {
    console.log(e);
    alert('Something bad happened: ' + e);
    return;
  }

  const sourceSelector: any =document.getElementById('sourceSelector');
  const typeSelector: any = document.getElementById("typeSelector")

  let videoSource_: CameraSource = new CameraSource()


  async function updatePipelineSource() {
    const sourceType = sourceSelector.options[sourceSelector.selectedIndex].value;
    const typeType = typeSelector.options[typeSelector.selectedIndex].value

    setVonageMetadata({appId: '123', sourceType: 'test'})
    
    
    if(sourceType === 'stop'){
      await videoSource_.stopMediaProcessorConnector()
      return;
    }else if(sourceType === 'camera'){
      let mediaProcessor: MediaProcessor = new MediaProcessor()
      let transformer: MediapipeTransformer = new MediapipeTransformer()
      transformer.init(typeType).then( () => {
        let arr: Array<Transformer> = []
        arr.push(transformer)
        mediaProcessor.setTransformers(arr).then(() => {
          let connector: MediaProcessorConnector = new MediaProcessorConnector(mediaProcessor)
          videoSource_.setMediaProcessorConnector(connector).then( () => {
          }).catch(e => {
            throw e
          })
        })
      }).catch(e => {
        throw e
      })
    }
  }
  sourceSelector.oninput = updatePipelineSource;
  sourceSelector.disabled = false;
}

window.onload = main;

