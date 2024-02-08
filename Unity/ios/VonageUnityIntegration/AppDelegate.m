//
//  AppDelegate.m
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import "AppDelegate.h"
#import <AVFoundation/AVCaptureSession.h>
#import <UnityFramework/UnityFramework.h>
NSDictionary* appLaunchOpts;

@interface ViewController : NSObject
+(UnityAppController*) getUnityAppController;
@end

@interface AppDelegate ()

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    appLaunchOpts = launchOptions;
    return YES;
}

#pragma mark - UISceneSession lifecycle


- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options {
    // Called when a new scene session is being created.
    // Use this method to select a configuration to create the new scene with.
    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}


- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions {
    // Called when the user discards a scene session.
    // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
    // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
}


- (void)applicationWillResignActive:(UIApplication *)application {
    [[ViewController getUnityAppController] applicationWillResignActive: application];
}
- (void)applicationDidEnterBackground:(UIApplication *)application {
    [[ViewController getUnityAppController] applicationDidEnterBackground: application];
}
- (void)applicationWillEnterForeground:(UIApplication *)application {
    [[ViewController getUnityAppController] applicationWillEnterForeground: application];
}
- (void)applicationDidBecomeActive:(UIApplication *)application {
    [[ViewController getUnityAppController] applicationDidBecomeActive: application];
}
- (void)applicationWillTerminate:(UIApplication *)application {
    [[ViewController getUnityAppController] applicationWillTerminate: application];
}


@end
