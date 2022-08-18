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
  
  const typeSelector: any = document.getElementById('typeSelector');
  const githubButtonSelector: HTMLElement | null = document.getElementById("githubButton")
  const vividButtonSelector: HTMLElement | null = document.getElementById("vividButton")
  let source:any

     
  async function updatePipelineSource() {
    {
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
  if(githubButtonSelector){
    githubButtonSelector.addEventListener('click', () => {
      window.open("https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples", '_blank')?.focus();
    })
  }

  if(vividButtonSelector){
    vividButtonSelector.addEventListener('click', () => {
      window.open("https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid", '_blank')?.focus();
    })
  }
  updatePipelineSource()
}
window.onload = main;


