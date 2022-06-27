import { MediaProcessor, setVonageMetadata } from '@vonage/media-processor';


if( 'function' === typeof importScripts) {

    const DEFAULT_BRIGHNESS_LEVEL = 100;
    const FACE_DETECTION_TIME_GAP = 200000;
    const AUTO_BRIGHTNESS_TIME_GAP = 200000;

    let mediaProcessor;

    let enableAutoZoom = true;
    let enableAutoBrightness = true;
    let fixedRatio = null;
    let published = false;
    let brightnessLevel = DEFAULT_BRIGHNESS_LEVEL;

    let padding;
    let videoDimension;
    let faceDimension;
    let visibleRectDimension;
    let faceDetectionlastTimestamp = 0;
    let autoBrightnesslastTimestamp = 0;

    let brightnessCanvas = new OffscreenCanvas(1, 1);
    let brightnessCanvasCtx = brightnessCanvas.getContext('2d', {alpha: false, desynchronized: true});
    let resultCanvas = new OffscreenCanvas(1, 1);
    let resultCanvasCtx = resultCanvas.getContext('2d', {alpha: false, desynchronized: true});
    if (!resultCanvasCtx || !brightnessCanvasCtx) {
      throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
    }  

    /********************
     * Media Processing
     *******************/
    function createMediaProcessor() {
        return new Promise((resolve, reject) => {
          mediaProcessor = new MediaProcessor();
    
          mediaProcessor.on('error', ( eventData => {
            const msg = {callbackType: 'media_processor_error_event', message: eventData}
            postMessage(JSON.stringify(msg));
          }))
          mediaProcessor.on('warn', ( eventData => {
            const msg = {callbackType: 'media_processor_warn_event', message: eventData}
            postMessage(JSON.stringify(msg));
          }))
          mediaProcessor.on('pipelineInfo', ( eventData => {
            const msg = {callbackType: 'media_processor_pipeline_event', message: eventData}
            postMessage(JSON.stringify(msg))
          }))
          
          let transformers = []
          transformers.push({transform});
          mediaProcessor.setTransformers(transformers).then( () => {
    
            resolve()
          }).catch(e => {
            reject(e)
          })
        })
      }

    function transform(frame, controller) {        
        if (!videoDimension) {
            videoDimension = {
                width: frame.displayWidth,
                height: frame.displayHeight
            }
        }
        const timestamp = frame.timestamp;

        createImageBitmap(frame).then( image =>{
          frame.close()
          processFrame(controller, image, timestamp)
        }).catch(e => {
          controller.enqueue(frame)
        })
      }

    function processFrame(controller, image, timestamp){

        // Face Detection
        if(enableAutoZoom && (timestamp - faceDetectionlastTimestamp >= FACE_DETECTION_TIME_GAP)){
            faceDetectionlastTimestamp = timestamp;
            postMessage(image)
        }
        // Brightness Detection
        if(enableAutoBrightness && (timestamp - autoBrightnesslastTimestamp >= AUTO_BRIGHTNESS_TIME_GAP)){
          autoBrightnesslastTimestamp = timestamp;
          brightnessCanvas.width = image.width;
          brightnessCanvas.height = image.height;
          brightnessCanvasCtx.drawImage(image, 0, 0);
          detectBrightness();
        }

        if (!visibleRectDimension || !enableAutoZoom) {
          resultCanvas.width = image.width;
          resultCanvas.height = image.height;
          resultCanvasCtx.filter = "brightness(" + brightnessLevel + "%)";

          resultCanvasCtx.drawImage(image, 0, 0);
        }
        else {
          resultCanvas.width = visibleRectDimension.visibleRectWidth;
          resultCanvas.height = visibleRectDimension.visibleRectHeight;
          resultCanvasCtx.filter = "brightness(" + brightnessLevel + "%)";

          resultCanvasCtx.drawImage(image, 
            visibleRectDimension.visibleRectX, 
            visibleRectDimension.visibleRectY,
            visibleRectDimension.visibleRectWidth,
            visibleRectDimension.visibleRectHeight,
            0,
            0,
            visibleRectDimension.visibleRectWidth,
            visibleRectDimension.visibleRectHeight);
            if (!published) {
              const msg = {callbackType: 'publish'}
              postMessage(JSON.stringify(msg));
              published = true;         
            }
        }

        const newFrame =  new VideoFrame(resultCanvas, {timestamp, alpha: 'discard'});
        controller.enqueue(newFrame);
        image.close()
      }

     /********************
     * Face Detection
     *******************/
    function calculateDimensions(forceRecalculate = false) {
        let newWidth = Math.floor((faceDimension.width * videoDimension.width) + (padding.width*2));
        let newHeight = Math.floor((faceDimension.height * videoDimension.height) + (padding.height*2));
        let newX = Math.floor((faceDimension.xCenter * videoDimension.width) - (faceDimension.width * videoDimension.width)/2) - padding.width;
        newX = Math.max(0, newX);
        let newY = Math.floor((faceDimension.yCenter * videoDimension.height) - (faceDimension.height * videoDimension.height)/2) - padding.height;
        newY = Math.max(0, newY);
        
        if (fixedRatio) {
            newWidth = fixedRatio * newHeight
            newX = Math.floor((faceDimension.xCenter * videoDimension.width) - (newWidth)/2);
            newX = Math.max(0, newX);
        }
        
        if (forceRecalculate || !visibleRectDimension || Math.abs(newX - visibleRectDimension.visibleRectX) > 70 || Math.abs(newY - visibleRectDimension.visibleRectY) > 70 ) {
            // Ensure x and y is even value
            let visibleRectX = (( newX % 2) === 0) ? newX : (newX + 1);
            let visibleRectY = (( newY % 2) === 0) ? newY : (newY + 1);
            // Ensure visibleRectWidth and visibleRectHeight fall within videoWidth and videoHeight
            let visibleRectWidth = (visibleRectX + newWidth) > videoDimension.width ? (videoDimension.width -  visibleRectX) : newWidth
            let visibleRectHeight = (visibleRectY + newHeight) > videoDimension.height ? (videoDimension.height -  visibleRectY) : newHeight
            visibleRectDimension= {
            visibleRectX,
            visibleRectY,
            visibleRectWidth,
            visibleRectHeight
            }
        }
    }

    /********************
     * Brightness Detection
     *******************/
    async function detectBrightness(){  
      let imageData = brightnessCanvasCtx.getImageData(0,0,brightnessCanvas.width,brightnessCanvas.height);
      let data = imageData.data;
      let r,g,b, max_rgb;
      let light = 0, dark = 0;
      let fuzz = -0.15;

      for(var x = 0, len = data.length; x < len; x+=4) {
        r = data[x];
        g = data[x+1];
        b = data[x+2];  
        max_rgb = Math.max(Math.max(r, g), b);
        if (max_rgb < 128)
            dark++;
        else
            light++;
      }

      let dl_diff = (light - dark) / (brightnessCanvas.width*brightnessCanvas.height);

      switch(true) {
        case (dl_diff + fuzz < -0.6):
          brightnessLevel = 160
          break;
        case (dl_diff + fuzz < -0.4):
          brightnessLevel = 145
          break;
        case (dl_diff + fuzz < -0.2):
          brightnessLevel = 130
          break;
        case (dl_diff + fuzz < 0):
          brightnessLevel = 115
          break;
        default:
          brightnessLevel = 100
      }

      const msg = {callbackType: 'brightness', brightnessLevel}
      postMessage(JSON.stringify(msg));
    }

    /********************
     * Worker Listeners
    *******************/
    onmessage = async (event) => {
        const {operation} = event.data;
        if (operation === 'init'){
          const {metaData} = event.data;
          ({padding} = event.data);
          if(typeof metaData === 'string'){
            setVonageMetadata(JSON.parse(metaData))
          }
          createMediaProcessor().then( () => {
            const msg = {callbackType: 'success', message: operation}
            postMessage(JSON.stringify(msg));
          }).catch(e=> {
            const msg = {callbackType: 'error', message: operation, error: getErrorMessage(e)}
            postMessage(JSON.stringify(msg));
          })
        } else if (operation === 'transform') {
          const {readable, writable} = event.data;
          mediaProcessor.transform(readable, writable).then(() => {
            const msg = {callbackType: 'success', message: operation}
            postMessage(JSON.stringify(msg));
          })
          .catch(e => {
            const msg = {callbackType: 'error', message: operation, error: getErrorMessage(e)}
            postMessage(JSON.stringify(msg));
          })
        }
        else if (operation === 'updateAutoBrightnessState') {
          ({enableAutoBrightness} = event.data)
          if (!enableAutoBrightness) {
            brightnessLevel = DEFAULT_BRIGHNESS_LEVEL;
            const msg = {callbackType: 'brightness', brightnessLevel}
            postMessage(JSON.stringify(msg));
          }
        }
        else if (operation === 'updateAutoZoomState') {
          ({enableAutoZoom} = event.data)
        }
        else if (operation === 'updatePadding') {
          ({padding} = event.data)
          calculateDimensions(true);
        }
        else if (operation === 'updateFixedRatio') {
          ({fixedRatio} = event.data)
          calculateDimensions(true);
        }
        else if (operation === 'updateBrightnessLevel') {
          ({brightnessLevel} = event.data)
        }
        else if (operation === 'faceDetectionResult') {
            const {result} = event.data;
            faceDimension = {
                width: result.width,
                height: result.height,
                xCenter: result.xCenter,
                yCenter: result.yCenter
            }
            calculateDimensions();
        }
      };
}
