# Insertable Streams iOS Unity sample
This sample application shows how to use insertable streams (video) in ios app to render video frame buffers using unity.
### Prerequisite:
- Unity - this sample was built with Unity *2021.3.6f1* (make sure iOS is installed)
### Building Unity:
- Open Unity `UnityVideoProject` from `Unity/UnityVideoProject`
- From file menu select build settings.
- Select iOS from platform list.
- Switch the platform.
- Open player setting window.
- In player settings iOS tab, set target SDK to device SDK (You can also select simulator SDK if you are using iOS simulator). **Unity supports one target per build.**
- Close the player setting window.
- Set `Run XCode as Debug` if you plan to run the iOS native app in debug mode. **Unity supports one configuration per build.**
- Build unity project for iOS.
- Open the generated project `Unity-iPhone.xcodeproj`.
- In file inspector select Data folder and set target membership to `UnityFramework`.
- In file inspector select `Libraries/Plugins/iOS/NativeCallProxy.h` and set target membership to `UnityFramework` and `Public`.
- In the project `build settings` for target `UnityFramework` set `c++ language` to `c++17` and set `c language` to `gnu11`.
- Open terminal, change directory to the directory containing `Unity-iPhone.xcodeproj` and run this command to build Unity framework:
```
xcodebuild -configuration Debug -target UnityFramework -sdk iphoneos
```
- Copy `UnityFramework.framework` folder that you have just built in previous step from `build/Debug-iphoneos/` to `ios/Unity-iPhone` directory.
### Building the app:
- Open the terminal at `examples/unity/ios`
- Install pods:
```
pod install --verbose --repo-update --clean-install
```
- Open `VonageUnityIntegration.xcworkspace`.
- In the general settings of `VonageUnityIntegration` target, add the 'Unity-iPhone/UnityFramework.framework' to the target.
- Build and run the `VonageUnityIntegration` project.

## Key points for Unity iOS integration
The main iOS app code that communicates with Unity is located in file [transformers.cpp](https://github.com/Vonage/vonage-media-transformers-samples/blob/main/Unity/ios/VonageUnityIntegration/transformers.cpp) that contains insertable stream implementation in Unity video transformer class.
