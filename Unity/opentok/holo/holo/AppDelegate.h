#import <UIKit/UIKit.h>

#include <UnityFramework/UnityFramework.h>
#include <UnityFramework/NativeCallProxy.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate, UnityFrameworkListener>

@property UnityFramework* ufw;
@property bool didQuit;

- (void)initUnity;

@end

extern int gArgc;
extern char** gArgv;
extern UnityFramework *gUfw;