/*
  importing dependencies 
*/
import CameraSource from '../../common/js/camera-source'
import { isSupported, setVonageMetadata, MediaProcessor, MediaProcessorConnector, VonageMetadata, ErrorData, WarnData, PipelineInfoData } from '@vonage/media-processor'
import UnityTransformer from './js/UnityTransformer'

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

  const githubButtonSelector: HTMLElement | null = document.getElementById("githubButton")
  const vividButtonSelector: HTMLElement | null = document.getElementById("vividButton")
  let source: CameraSource


  async function updatePipelineSource() {
    {
      source = new CameraSource()
    }
    await source.init().then(async () => {

      const metadata: VonageMetadata = {
        appId: 'vonage-unity-example',
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
      let unityTransformer: UnityTransformer = new UnityTransformer()
      unityTransformer.init().then(() => {
        let transformers: Array<Transformer> = [];
        transformers.push(unityTransformer);
        mediaProcessor.setTransformers(transformers);
        let connector: MediaProcessorConnector = new MediaProcessorConnector(mediaProcessor);
        source.setMediaProcessorConnector(connector).catch(e => {
          console.log(e)
        })
      }).catch(e => {
        console.log(e)
      })

    }).catch(e => {
      console.error(e)
    })
  }
  if (githubButtonSelector) {
    githubButtonSelector.addEventListener('click', () => {
      window.open("https://github.com/Vonage/vonage-media-transformers-samples/tree/main/examples/unity", '_blank')?.focus();
    })
  }

  if (vividButtonSelector) {
    vividButtonSelector.addEventListener('click', () => {
      window.open("https://vivid.vonage.com/?path=/story/introduction-meet-vivid--meet-vivid", '_blank')?.focus();
    })
  }
  updatePipelineSource()
}
window.onload = main;


