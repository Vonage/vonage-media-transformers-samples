# Insertable Streams iOS Unity sample
This sample application shows how to integrate insertable streams (video) with unity.
Integrating this sample with **Vonage Video SDK** will allow you to publish a unity scene as your video. 

### Prerequisite:
 - Unity - this sample was built with Unity *2021.3.6f1* (make sure ios is installed)

### Building Unity:
- In player settings iOS tab, set target SDK to device SDK (You can also select simulator SDK if you are using iOS simulator)
- From file meny select build settings.
- Select iOS from platform list.
- Set 'Run XCode as Debug' if you plan to run the ios native app in debug mode.
- Build unity project for iOS.
- Open the generated project 'Unity-iPhone.xcodeproj' with XCode.
- In file inspector select Data folder and set target membership to 'UnityFramework'
- In file inspector select Libraries/Plugins/iOS/NativeCallProxy.h and set target membership to 'UnityFramework' and 'Public'.
- Open terminal, change directory to the directory containing 'Unity-iPhone.xcodeproj' and run this command to build Unity framework:
  ```
  xcodebuild -configuration Debug -target UnityFramework -sdk iphoneos
  ```
- Copy 'UnityFramework.framework' that you have just built in previous step from build/Debug-iphoneos/ to 'Unity-iPhone' directory. 

### Building the app:
- Open VonageUnityIntegration.xcworkspace with XCode.
- In the general settings of 'VonageUnityIntegration' target, add the 'Unity-iPhone/UnityFramework.framework' to the target.
- Build and run the 'VonageUnityIntegration' project.

## Key points for Unity iOS integration

The main iOS app code that communicates with Unity is located in file [transformers.cpp](https://github.com/Vonage/vonage-media-transformers-samples/blob/feature/iOS/examples/unity/ios/VonageUnityIntegration/transformers.cpp) that contains insertable stream implementation in Unity video transformer class.


