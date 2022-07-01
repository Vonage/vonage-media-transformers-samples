import './style.css';
import initLayoutContainer from 'opentok-layout-js'
import Worker from './worker?worker&inline'
import { isSupported, MediapipeHelper } from '@vonage/ml-transformers';
import {MediaProcessorConnector} from '@vonage/media-processor';

async function main() {

/******************
 * Screen Layout
 ******************/

let layoutContainer = document.getElementById("layoutContainer");

// Initialize the layout container and get a reference to the layout method
const options = {
    maxRatio: 2/3,             // The narrowest ratio that will be used (default 2x3)
    minRatio: 16/9,            // The widest ratio that will be used (default 16x9)
    fixedRatio: true,         // If this is true then the aspect ratio of the video is maintained and minRatio and maxRatio are ignored (default false)
    scaleLastRow: false,        // If there are less elements on the last row then we can scale them up to take up more space
    alignItems: 'center',      // Can be 'start', 'center' or 'end'. Determines where to place items when on a row or column that is not full
    bigClass: "OT_big",        // The class to add to elements that should be sized bigger
    bigPercentage: 0.8,        // The maximum percentage of space the big ones should take up
    minBigPercentage: 0,       // If this is set then it will scale down the big space if there is left over whitespace down to this minimum size
    bigFixedRatio: false,      // fixedRatio for the big ones
    bigScaleLastRow: true,     // scale last row for the big elements
    bigAlignItems: 'center',   // How to align the big items
    smallAlignItems: 'center', // How to align the small row or column of items if there is a big one
    maxWidth: Infinity,        // The maximum width of the elements
    maxHeight: Infinity,       // The maximum height of the elements
    smallMaxWidth: Infinity,   // The maximum width of the small elements
    smallMaxHeight: Infinity,  // The maximum height of the small elements
    bigMaxWidth: Infinity,     // The maximum width of the big elements
    bigMaxHeight: Infinity,    // The maximum height of the big elements
    bigMaxRatio: 3/2,          // The narrowest ratio to use for the big elements (default 2x3)
    bigMinRatio: 9/16,         // The widest ratio to use for the big elements (default 16x9)
    bigFirst: true,            // Whether to place the big one in the top left (true) or bottom right (false).
                               // You can also pass 'column' or 'row' to change whether big is first when you are in a row (bottom) or a column (right) layout
    animate: true,             // Whether you want to animate the transitions using jQuery (not recommended, use CSS transitions instead)
    window: window,            // Lets you pass in your own window object which should be the same window that the element is in
    ignoreClass: 'OT_ignore',  // Elements with this class will be ignored and not positioned. This lets you do things like picture-in-picture
    onLayout: null,            // A function that gets called every time an element is moved or resized, (element, { left, top, width, height }) => {} 
};

let layout = initLayoutContainer(layoutContainer, options);
layout.layout();

/*********************
 * Context & State
 ********************/

// session info variables
let apiKey;
let sessionId;
let token;
let session;

// brightness variables
let initialBrightnessInput;
let initialBrightnessLevel;

// face detection variables
let videoDimension
let padding = {
  width: 60,
  height: 80
}

// worker
const worker = new Worker();

// Dom elements
const croppedVideo = document.getElementById('croppedVideo')
const autoZoomButton = document.getElementById('autoZoomButton');
const adjustBrightnessButton = document.getElementById('adjustBrightnessButton');
const brightnessLevelSection = document.getElementById('brightnessLevel');
const brightnessLevelInput = brightnessLevelSection.getElementsByTagName('input')[0];
const widthPaddingSection = document.getElementById('widthPadding');
const widthPaddingInput = widthPaddingSection.getElementsByTagName('input')[0];
const heightPaddingSection = document.getElementById('heightPadding');
const heightPaddingLabel = heightPaddingSection.getElementsByTagName('label')[0];
const heightPaddingInput = heightPaddingSection.getElementsByTagName('input')[0];
const fixedRatioSection = document.getElementById('fixedRatio');
const fixedRatioCheckbox = fixedRatioSection.getElementsByTagName('input')[0];
const autoBrightnessSection = document.getElementById('autoBrightness');
const autoBrightnessCheckbox = autoBrightnessSection.getElementsByTagName('input')[0];
const settingButton = document.getElementById('popOverTitle');
const popOverContent = document.getElementById('popOverContent');
const loader = document.getElementById('loader');

/*********************
 * MediaStream Support
 ********************/
if (typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined' ) {
  alert(
      'Your browser does not support the experimental MediaStreamTrack API ' +
      'for Insertable Streams of Media. See the note at the bottom of the ' +
      'page.');
}

/****************************
 * Initialize mediaPipeHelper
 ****************************/

const mediaPipeHelper = new MediapipeHelper();
mediaPipeHelper.initialize({
  mediaPipeModelConfigArray: [{modelType: "face_detection", options: {
      selfieMode: false,
      minDetectionConfidence: 0.5,
      model: 'short'
    }, 
    listener: (results) => {
       if (results && results.detections.length !== 0) {
        worker.postMessage({
          operation: "faceDetectionResult",
          result: results.detections[0].boundingBox
        })
      }
    }}]
}).then(() => {
  worker.postMessage({
    operation: "init",
    metaData: JSON.stringify({appId: '123', sourceType: 'test'}),
    padding
  })
})

/*********************
 * Sessions
 ********************/
// Get sessions info from server.js
// TODO: remove
axios.get("/session/test", {})
.then(result => {
  if (result.status === 200) {
    apiKey = result.data ? result.data.apiKey : "";
    sessionId = result.data ? result.data.sessionId : "";
    token = result.data ? result.data.token : "";
    // connect to session
    initializeSession();
  }
})
.catch(error => {
  console.error(error);
});

async function initializeSession() {
  console.log("initializeSession");

 session = OT.initSession(apiKey, sessionId);

  // Connect to the session
  await session.connect(token, function(error) {
    // If the connection is successful, publish to the session
    if (error) {
      console.log("SESSION CONNECT ERROR", error)
      handleError(error);
    } else {
      console.log("SESSION CONNECT SUCCESS")
      initializeStream();
      layout.layout();
    }
  });

  session.on('streamCreated', function(event) {
    console.log("STREAM CREATED", event);
    session.subscribe(event.stream, 'layoutContainer', {
      insertMode: 'append'
    }, handleError);
    setTimeout(() => {
      layout.layout();
    }, 2000);
  });

  session.on('streamDestroyed', (event) => {
    console.log("STREAM DESTROYED", event);
    event.preventDefault();
    session.getSubscribersForStream(event.stream).forEach((subscriber) => {
      subscriber.element.classList.remove('ot-layout');
      setTimeout(() => {
        subscriber.destroy();
        layout.layout();
      }, 500);
    });
  });

  session.on('streamPropertyChanged', (event) => {
    console.log("STREAM CHANGED", event);
    if (event.changedProperty === "videoDimensions") {
      setTimeout(() => {
        layout.layout();
      }, 500);
    }
  })
}


/*********************
 * Utils
 ********************/
// Handling all of our errors here by alerting them
function handleError(error) {
  if (error) {
    alert(error.message);
  }
}

/*********************
 * Streams & Tracks
 ********************/
async function initializeStream() {
    try {
      await isSupported();
    } catch(e) {
      console.log(e);
      alert('Something bad happened: ' + e);
      return;
    }

    // Get webcam track
    const track = await navigator.mediaDevices.getUserMedia({
        video: {
          frameRate: 30
        }
    });

    // Set Media Stream 
    const videoTrack = track.getVideoTracks()[0];
    const {width, height} = videoTrack.getSettings();
    videoDimension = {
      width,
      height
    }

    // set initial width and height padding
    widthPaddingInput.value = Math.floor(padding.width/(width/2)*100);
    widthPaddingInput.disabled = false;
    heightPaddingInput.value = Math.floor(padding.height/(height/2)*100);
    heightPaddingInput.disabled = false;

    // Initialize media processor
    let connector = new MediaProcessorConnector({transform})//init stuff);
    let newTrack = await connector.setTrack(videoTrack);
    let processedStream = new MediaStream([newTrack]);
    croppedVideo.srcObject = processedStream
}


function transform(readable, writable){ 
  return new Promise((resolve, reject) => {
    worker.postMessage({
      operation: 'transform',
      readable: readable,
      writable: writable,
    }, [readable, writable]);
    resolve()
  })
}

/*****************
 * Publish Stream
 ***************/
function publishStream() {
  const croppedVideoElement = croppedVideo.captureStream();
  const videoTracks = croppedVideoElement.getVideoTracks();

  // Create a publisher
  let publisher = OT.initPublisher('croppedVideo', {
       insertMode: 'append',
      videoSource: videoTracks[0]
   }, handleError);
  session.publish(publisher, handleError);
  console.log("Published")
  loader.classList.remove('is-loading');
}

/*********************
 * Brightness
 ********************/
function updateBrightnessInput(brightnessLevel) {
  brightnessLevelInput.value = brightnessLevel / 2;
  initialBrightnessLevel = brightnessLevel;
  initialBrightnessInput = brightnessLevel / 2;
}

/*********************
 * Listeners
 ********************/
// Worker
worker.addEventListener('message', ((msg) => {
  if(msg.data instanceof ImageBitmap){
    mediaPipeHelper.send(msg.data).then( () => {
      msg.data.close()
    })
    .catch(e => {
      console.log("error: ", e)
    })
  }else {
    let inputData = JSON.parse(msg.data);
    if(inputData.callbackType === 'media_processor_error_event'){
      console.log('error', inputData.message)
    } else if(inputData.callbackType === 'media_processor_warn_event'){
      console.log('warn', inputData.message)
    }
    else if(inputData.callbackType === 'media_processor_pipeline_event') {
      console.log('pipelineInfo', inputData.message)
      let msg = inputData.message
      if(msg.message === 'pipeline_ended' || msg.message === 'pipeline_ended_with_error'){
        mediaPipeHelper.close().finally( () => {
          if(worker){
            worker.terminate()
          }
        })
      }
    } else if (inputData.callbackType === 'publish') {
      publishStream();
    } else if (inputData.callbackType === 'brightness') {
      updateBrightnessInput(inputData.brightnessLevel)
    }
  }
}))

// Enable or Disable auto zoom
autoZoomButton.addEventListener("click", () => {
  let enableAutoZoom = true;
  if (autoZoomButton.classList.contains('enable')) {
    autoZoomButton.classList.remove('enable');
    fixedRatioSection.classList.remove('is-shown');
    widthPaddingSection.classList.remove('is-shown');
    heightPaddingSection.classList.remove('is-shown');
    enableAutoZoom = false;
  }
  else {
    autoZoomButton.classList.add('enable');
    fixedRatioSection.classList.add('is-shown');
    heightPaddingSection.classList.add('is-shown');
    if (!fixedRatioCheckbox.checked) {
      widthPaddingSection.classList.add('is-shown');
    }
  }
  worker.postMessage({
    operation: "updateAutoZoomState",
    enableAutoZoom
  })
})

// Enable or Disable adjust brightness
adjustBrightnessButton.addEventListener("click", () => {
  let enableAutoBrightness = false;
  if (adjustBrightnessButton.classList.contains('enable')) {
    adjustBrightnessButton.classList.remove('enable');
    brightnessLevelSection.classList.remove('is-shown');
    autoBrightnessSection.classList.remove('is-shown');
  }
  else {
    adjustBrightnessButton.classList.add('enable');
    autoBrightnessSection.classList.add('is-shown');
    if (!autoBrightnessCheckbox.checked) {
      brightnessLevelSection.classList.add('is-shown')
    }
    else {
      enableAutoBrightness = true;
    }
  }
  worker.postMessage({
    operation: "updateAutoBrightnessState",
    enableAutoBrightness
  })
})

// Change Brightness Level
brightnessLevelInput.addEventListener("change", (e) => {
  let delta = e.currentTarget.value - initialBrightnessInput;
  let brightnessLevel = initialBrightnessLevel + delta*2;
  brightnessLevel = Math.max(0, brightnessLevel);

  worker.postMessage({
    operation: "updateBrightnessLevel",
    brightnessLevel
  })
})

// Change Width Padding
widthPaddingInput.addEventListener("change", (e) => {
  padding.width = Math.floor((e.currentTarget.value/100) * (videoDimension.width/2));
  worker.postMessage({
    operation: "updatePadding",
    padding
  })
})

// Change Height Padding
heightPaddingInput.addEventListener("change", (e) => {
  padding.height = Math.floor((e.currentTarget.value/100) * (videoDimension.height/2));
  worker.postMessage({
    operation: "updatePadding",
    padding
  })
})

// Fix Ratio checkbox
fixedRatioCheckbox.addEventListener("change", () => {
  let fixedRatio = null;
  if (fixedRatioCheckbox.checked) {
    heightPaddingLabel.innerHTML = "Padding"
    widthPaddingSection.classList.remove('is-shown');
    fixedRatio = videoDimension.width/videoDimension.height
  }
  else {
    heightPaddingLabel.innerHTML = "Height Padding"
    widthPaddingSection.classList.add('is-shown');
  }
  worker.postMessage({
    operation: "updateFixedRatio",
    fixedRatio
  })
})

// Auto brightness checkbox
autoBrightnessCheckbox.addEventListener("change", () => {
  let enableAutoBrightness = false;
  if (autoBrightnessCheckbox.checked) {
    brightnessLevelSection.classList.remove('is-shown');
    enableAutoBrightness = true;
  }
  else {
    brightnessLevelSection.classList.add('is-shown');
  }
  worker.postMessage({
    operation: "updateAutoBrightnessState",
    enableAutoBrightness
  })
})

// Setting Button
settingButton.addEventListener("click", (e) => {
  e.stopPropagation();
  if (popOverContent.classList.contains('is-shown')) {
    popOverContent.classList.remove('is-shown');
  }
  else {
    popOverContent.classList.add('is-shown');
  }
});

// stop propagation on popOverContent
popOverContent.addEventListener("click", (e) => {
  e.stopPropagation();
});

document.body.addEventListener("click", () => {
  if (popOverContent.classList.contains('is-shown')) {
    popOverContent.classList.remove('is-shown');
  }
})

// Call the layout method any time the size of the layout container changes
let resizeTimeout;
window.onresize = function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function () {
    layout.layout();
  }, 20);
};

croppedVideo.addEventListener('resize', (e) => {
  layout.layout();
});

window.requestAnimFrame = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame;

}

window.onload = main;