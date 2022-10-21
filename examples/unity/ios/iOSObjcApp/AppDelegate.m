//
//  AppDelegate.m
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import "AppDelegate.h"
#import <AVFoundation/AVCaptureSession.h>

int gArgc = 0;
char** gArgv = nullptr;
NSDictionary* appLaunchOpts;


UnityFramework* UnityFrameworkLoad()
{
    NSString* bundlePath = nil;
    bundlePath = [[NSBundle mainBundle] bundlePath];
    bundlePath = [bundlePath stringByAppendingString: @"/Frameworks/UnityFramework.framework"];
    
    NSBundle* bundle = [NSBundle bundleWithPath: bundlePath];
    if ([bundle isLoaded] == false) [bundle load];
    
    UnityFramework* ufw = [bundle.principalClass getInstance];
    if (![ufw appController])
    {
        // unity is not initialized
        [ufw setExecuteHeader: &_mh_execute_header];
    }
    return ufw;
}

@interface AppDelegate ()

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Override point for customization after application launch.
    
    appLaunchOpts = launchOptions;
    
    [self initUnity];
    
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


- (bool)unityIsInitialized { return [self ufw] && [[self ufw] appController]; }

- (void)initUnity
{
    if([self unityIsInitialized]) {
        NSLog(@"Unity already initialized. Unload Unity first");
        return;
    }
    
    if([self didQuit]) {
        NSLog(@"Unity cannot be initialized after quit. Use unload instead");
        return;
    }
    
    [self setUfw: UnityFrameworkLoad()];
    // Set UnityFramework target for Unity-iPhone/Data folder to make Data part of a UnityFramework.framework and uncomment call to setDataBundleId
    // ODR is not supported in this case, ( if you need embedded and ODR you need to copy data )
    [[self ufw] setDataBundleId: "com.unity3d.framework"];
    [[self ufw] registerFrameworkListener: self];
    
    [[self ufw] runEmbeddedWithArgc: gArgc argv: gArgv appLaunchOpts: appLaunchOpts];
    [self.ufw.appController.window setHidden:YES];
}

- (void)unloadButtonTouched:(UIButton *)sender
{
    if(![self unityIsInitialized]) {
        NSLog(@"Unity is not initialized. Initialize Unity first");
    } else {
        [UnityFrameworkLoad() unloadApplication];
    }
}

- (void)unityDidUnload:(NSNotification*)notification
{
    NSLog(@"unityDidUnload called");
    
    [[self ufw] unregisterFrameworkListener: self];
    [self setUfw: nil];
}

- (void)unityDidQuit:(NSNotification*)notification
{
    NSLog(@"unityDidQuit called");
    
    [[self ufw] unregisterFrameworkListener: self];
    [self setUfw: nil];
    [self setDidQuit:true];
}

- (void)applicationWillResignActive:(UIApplication *)application { [[[self ufw] appController] applicationWillResignActive: application]; }
- (void)applicationDidEnterBackground:(UIApplication *)application { [[[self ufw] appController] applicationDidEnterBackground: application]; }
- (void)applicationWillEnterForeground:(UIApplication *)application { [[[self ufw] appController] applicationWillEnterForeground: application]; }
- (void)applicationDidBecomeActive:(UIApplication *)application { [[[self ufw] appController] applicationDidBecomeActive: application]; }
- (void)applicationWillTerminate:(UIApplication *)application { [[[self ufw] appController] applicationWillTerminate: application]; }


@end
