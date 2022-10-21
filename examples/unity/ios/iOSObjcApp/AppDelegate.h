//
//  AppDelegate.h
//  iOSObjCApp
//
//  Created by Mohanad Hamed on 2022-10-13.
//

#import <UIKit/UIKit.h>
#include <UnityFramework/UnityFramework.h>
#include "../Unity-iPhone/Libraries/Plugins/iOS/NativeCallProxy.h"

@interface AppDelegate : UIResponder <UIApplicationDelegate, UnityFrameworkListener>

@property UnityFramework* ufw;
@property bool didQuit;


- (void)initUnity;

@end

extern int gArgc;
extern char** gArgv;
