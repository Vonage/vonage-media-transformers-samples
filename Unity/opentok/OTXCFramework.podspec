Pod::Spec.new do |s|
  s.name         = "OTXCFramework"
  s.version      = "2.27.0-custom.0"
  s.summary      = "OpenTok lets you weave interactive live WebRTC video streaming right into your application"
  s.description  = <<-DESC
                   The OpenTok iOS SDK lets you use WebRTC video sessions in apps you build for iPad,
                   iPhone, and iPod touch devices.
                   DESC
  s.homepage     = "https://tokbox.com/developer/sdks/ios/"
  s.license      = { :type => "Commercial", :text => "https://tokbox.com/support/tos" }
  s.author       = { "TokBox, Inc." => "support@tokbox.com" }

  s.platform     = :ios
  s.ios.deployment_target = '13.0'
  s.source       = { :http => 'file:' + __dir__ + '/OpenTok-4af7028dc.xcframework.zip' }
  s.resources = 'OpenTok.xcframework/ios-arm64/**/*.tflite'
  s.vendored_frameworks = "OpenTok.xcframework"
  s.frameworks   = "Foundation", "AVFoundation", "AudioToolbox", "CoreFoundation", "CoreGraphics",
                   "CoreMedia", "CoreTelephony", "CoreVideo", "GLKit", "OpenGLES", "QuartzCore",
                   "SystemConfiguration", "UIKit", "VideoToolbox", "Network", "Accelerate"
  s.libraries    = "c++"
  s.requires_arc = false
end
