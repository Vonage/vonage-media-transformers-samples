#import <UIKit/UIKit.h>

#import <TargetConditionals.h>
#if !(TARGET_IPHONE_SIMULATOR)
#import <UnityFramework/UnityFramework.h>
#endif

#if !(TARGET_IPHONE_SIMULATOR)
@interface ViewController : UIViewController<UnityFrameworkListener>
@end
#else
@interface ViewController : UIViewController
@end
#endif
