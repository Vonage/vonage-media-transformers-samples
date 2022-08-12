/*
  importing dependencies 
*/
import CameraSource from '../../common/js/camera-source'
import { isSupported, setVonageMetadata, MediaProcessor, MediaProcessorConnector, VonageMetadata, ErrorData, WarnData, PipelineInfoData } from '@vonage/media-processor'
import UnityBallTransformer from './js/UnityBallTransformer'

/*
  logic below
*/
async function main() {
  try {
    await isSupported();
  } catch (e) {
    console.log(e);
    alert('Something bad happened: ' + e);
    return;
  }
  const sourceSelector: any =document.getElementById('sourceSelector');
  let source:any// CameraSource //= new CameraSource()

  async function updatePipelineSource() {
    const sourceType = sourceSelector.options[sourceSelector.selectedIndex].value;
    if(sourceType === 'camera'){
      source = new CameraSource()
    }
    await source.init().then(async () => {
      let transformers: Array<Transformer> = [];

      const metadata: VonageMetadata = {
        appId: 'vonage-media-processor-example',
        sourceType: 'test'
      };
      setVonageMetadata(metadata);
      let mediaProcessor: MediaProcessor = new MediaProcessor();
      mediaProcessor.on('error', ((eventData: ErrorData) => {
        console.error(eventData.error, eventData.eventMetaData.transformerIndex, eventData.function);
      }))

      mediaProcessor.on('warn', ((eventData: WarnData) => {
        console.warn(eventData.dropInfo.requested, eventData.eventMetaData.transformerIndex, eventData.warningType);
      }))

      mediaProcessor.on('pipelineInfo', ((eventData: PipelineInfoData) => {
        console.info(eventData)
      }))
      mediaProcessor.setTrackExpectedRate(-1);
      transformers.push(new UnityBallTransformer());
      mediaProcessor.setTransformers(transformers);

      let connector: MediaProcessorConnector = new MediaProcessorConnector(mediaProcessor);
      try {
        await source.setMediaProcessorConnector(connector);
      }
      catch (e) {
        console.error(e)
      }
    }).catch((e: any) => {
      console.error(e)
    })
  }
  sourceSelector.oninput = updatePipelineSource;
  //updatePipelineSource();
}
window.onload = main;


