Pod::Spec.new do |s|
  s.name           = 'SecureRecorder'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for secure audio recording with streaming AES-256-GCM encryption'
  s.description    = 'A secure audio recording module for Expo/React Native with on-the-fly AES-256-GCM encryption'
  s.author         = 'Tiro Scribe'
  s.homepage       = 'https://github.com/Diwatt/tiro-scribe'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'SUPPORTED_PLATFORMS' => 'iphoneos iphonesimulator',
    'SUPPORTS_MACCATALYST' => 'NO',
    'SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD' => 'NO',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xfrontend -warn-long-function-bodies=100 -Xfrontend -warn-long-expression-type-checking=100'
  }

  s.source_files = "ios/**/*.{h,m,mm,swift,hpp,cpp}"
  s.exclude_files = "ios/Tests/**/*"
  
  # Help IDE indexing by explicitly defining module structure
  s.preserve_paths = "ios/**/*.swift"
end
