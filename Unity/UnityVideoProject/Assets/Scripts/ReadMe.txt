Unity Version:
In our example project we are using Unity 2021.3.6f1

Interaction with Web:
To interact with web we need an internal javascript, When building content for the web, you might need to communicate with other elements on your web page. Or you might want to implement functionality using Web APIs which Unity doesn’t currently expose by default. In both cases, you need to directly interface with the browser’s JavaScript engine. Unity WebGL
provides different methods to do this. Steps we need to follow are bellow
The recommended way of using browser JavaScript in your project is to add your JavaScript sources to your project, and then call those functions directly from your script code. To do so, place files with JavaScript code using the .jslib extension under a “Plugins” subfolder in your Assets folder. To see the syntax see our example test.jslib file

Then you can call your functions from your C# scripts by initilising your functions like this:
[DllImport("__Internal")]
private static extern void YourFunctionName();
Create your function with logic to read the values from browser and apply values to your texture. You will nedd to call this function from JS/Browser using SendMessage call.

Unity Scene:
Convert you Project into WebGL Platform from Build Settings. 
Create RawImage(you can use any image/or plane which has Texture, in our example we are using Canvas RawImage).
We need to enable texture settings to Read/Write enabled from the settings, this allows us to change/read pixels values
Set Wrap mode to Clamp from texture settings, you can change this settings in your script as well.
Add your C# Script to any of the gameobject in unity Scene, this will help to call functions from JS/browser.
Build your scene. Copy all four files from build folder which unity has created for you after build.

Web Insertible Stream Project:
Create a Public folder and paste all four files you copied from build folder into Public folder.
In your constructor of your transformer script initilise Unity Instance.
Extract values from your video and pass these values into unity by using unityGame.Module.HEAPF32.
call your logic function of C# using SendMessage call.
After all the process, get all the new values using same unityGame.Module.HEAPF32 array.
paste the values in image back again and send in enque. 



 