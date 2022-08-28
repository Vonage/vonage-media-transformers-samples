# Insertable Streams Unity sample
This sample application shows how to integrate insertable streams (video) with unity.
Integrating this sample with **Vonage Video SDK** will allow you to publish a unity scene as your video. 

# Demo
You can see a demo of this sample running at https://unity-insertable-streams-sample.s3.amazonaws.com/index.html

## Running the App

### Prerequisite:
 - Unity - this sample was built with Unity *2021.3.6f1* (make sure WebGL is installed)

### Building Unity:

 - From Unity Hub select *Open -> Add Project From Disk* and select **UnityVideoProject**
 - Select *File->Build Settings* and select Platform **WebGL** and click **Switch Platform**
 - Click **Build** 
 - On the popup window *Save As* **demoBuild** (this name is a must since we use this name in the demo to load Unity) using in windows you will have to create a folder with this name)
 - After the build is finished copy **all** files from *demoBuild->Build* to *Examples->Unity->public* (public folder is not part of the repo you should create it) the files are:
	- demoBuild.wasm
	- demoBuild.loader.js
	- demoBuild.framework.js
	- demoBuild.data
	
### Building the app:
 - Open your terminal at: *Examples->Unity->public* run this commands
	 - *npm install*
	 - *npm run dev* (for local debug run) will run on *http://localhost:3000/*
	 - *npm run build* -> *npm run preview* (for local release run) will run on *http://localhost:4173/*

## Key points for Unity JS integration
As you can see on the above section Unity for WebGL is compiling to *WebAssembly* with *emscripten* which allow us to use *emscripten* advantages. You can read more about it here [Unity WebGL documentation](https://docs.unity3d.com/Manual/webgl-interactingwithbrowserscripting.html)
One of the biggest advantages of *WebAssembly* is the capabilities of creating native buffers and *read/write* to this buffers from *JS*.
Our *jslib* integration file looks like this: 

    mergeInto(LibraryManager.library, {
    
      SetArrays: function (inputArray, inputSize, outputArray, outputSize) {
        var VonageUnity = {
            input: {
                array: inputArray,
                size: inputSize
            },
            output: {
                array: outputArray,
                size: outputSize
            } 
        }
        this.VonageUnity = VonageUnity
      },
    });
We save the Buffer reference to *window* object so it can be read from the *JS*.

Our *C#* integration looks like this:

    public  class  ExampleBridge : MonoBehaviour {
    	[DllImport("__Internal")]
    	private  static  extern  void  SetArrays(float[] inputArray, int  inputSize, float[] outputArray, int  outputSize);
    	float[] inputArray = new  float[5];
    	float[] outputArray = new  float[5];
    	void  Start(){
    		SetArrays(inputArray, 5, outputArray, 5);
    	}
    }

Now its possible to read/write to those buffers from *JS*:

    var  VonageUnity: any = globalThis.VonageUnity;
    if (typeof  VonageUnity === "object") {
	    //write
    	for (let  i = 0; i  <  imageData.data.length; i += 4) {
    		unityGame.Module.HEAPF32[(VonageUnity.input.array  >>  2) + i] = imageData.data[i] / 255
    		unityGame.Module.HEAPF32[(VonageUnity.input.array  >>  2) + i + 1] = imageData.data[i + 1] / 255
    		unityGame.Module.HEAPF32[(VonageUnity.input.array  >>  2) + i + 2] = imageData.data[i + 2] / 255
    		unityGame.Module.HEAPF32[(VonageUnity.input.array  >>  2) + i + 3] = imageData.data[i + 3] / 255
    	}
    	//read
    	for (let  i = 0; i  <  imageData.data.length; i += 4) {
    		imageData[i] = unityGame.Module.HEAPF32[(VonageUnity.output.array  >>  2) + i] * 255
    		imageData[i + 1] = unityGame.Module.HEAPF32[(VonageUnity.output.array  >>  2) + i + 1] * 255
    		imageData[i + 2] = unityGame.Module.HEAPF32[(VonageUnity.output.array  >>  2) + i + 2] * 255
    		imageData[i + 3] = unityGame.Module.HEAPF32[(VonageUnity.output.array  >>  2) + i + 3] * 255
    	}
    }
