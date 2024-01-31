# How to set up holo app build and run

## Introduction

The app here is just a simple one to one (two ways) video chat application.

Find here some useful information about how to set up holo app build and run.

This apps depends on the OpenTok SDK for iOS and integrates Unity into it (hence
depends on Unity too).

## Set up

### Prerequisites

#### Unity

Checkout [Insertable Streams iOS Unity sample](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/ios#insertable-streams-ios-unity-sample), [Prerequisite](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/ios#prerequisite) and follow [Building Unity](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/ios#building-unity).

Copy `UnityFramework.framework` bundle file at [Unity/opentok/Unity-iPhone/](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/opentok/Unity-iPhone/) instead.

#### OpenTok iOS SDK

This app integrates the OpenTok iOS SDK by using Cocopoads. Make sure you have it
installed.

Open the terminal, get to folder [Unity/opentok/](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/opentok)
and run the following command.

```bash
$ pod install --verbose --repo-update --clean-install
```

That will install the OpenTok SDK for iOS. The SDK is installed as framework bundle file under [Unity/opentok/Pods/OTXCFramework/](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/opentok/Pods/OTXCFramework).

Given the OpenTok iOS SDK is used for video communication any holo app user
should be familar with the OpenTok video platform a bit. In order to run the app,
the user has to set up authentication so the app can connect to an OpenTok
session. The app needs to be provided with some authentication credentials such
as an API key, session ID, and token.

To do this, log into your [Video API account](https://tokbox.com/account), either
create a new OpenTok API project or use an existing OpenTok API project, then go
to your project page and scroll down to the Project Tools section. From there,
you can generate a session ID and token manually. Use the project's API key along
with the session ID and token you generated.

Note it is important that when [creating the session](https://tokbox.com/developer/guides/create-session/)
you create a **relayed** one.

There is also support for a room service that creates these for you based on a
room name. Please continue reading so you find how to use it instead of creating
the authentication credentials on your own.

## Build the app

Before building the app make sure you hardcode the API key, session ID, and token
we mentioned before in file at [Unity/opentok/holo/holo/ViewController.mm](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/opentok/holo/holo/ViewController.mm).

As we mentioned before there is also support for room names so you can skip
setting the API key, session ID, and token. You can override the default name by
changing the value of constant `kHoloRoomName` at [Unity/opentok/holo/holo/ViewController.mm](https://github.com/Vonage/vonage-media-transformers-samples/tree/main/Unity/opentok/holo/holo/ViewController.mm).

Within Xcode go to Product then Build and let it build.

**Note:** There are two different schemes for the app `holo` and `holosim`.
Scheme `holo` cannot work when targeting iOS simulator and scheme `holosim`
cannot when targeting a real iPhone device. Make sure you select a working
combination.

## Run the app

Run the app in any iPhone device enabled with the TrueDepth camera.

**Note:** There are two different schemes for the app `holo` and `holosim`.
Scheme `holo` cannot work when targeting iOS simulator and scheme `holosim`
cannot when targeting a real iPhone device. Make sure you select a working
combination.
