#import <UIKit/UIKit.h>

#import <TargetConditionals.h>

#if !(TARGET_IPHONE_SIMULATOR)
#include <UnityFramework/UnityFramework.h>
#include <UnityFramework/NativeCallProxy.h>
#endif

extern int gArgc;
extern char** gArgv;

#if !(TARGET_IPHONE_SIMULATOR)
extern UnityFramework *gUfw;

@interface AppDelegate : UIResponder <UIApplicationDelegate, UnityFrameworkListener>
@property UnityFramework* ufw;
@property bool didQuit;

- (void)initUnity;

#else
@interface AppDelegate : UIResponder <UIApplicationDelegate>
#endif

@end
