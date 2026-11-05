require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "MelSpectrogram"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = "https://github.com/Diwatt/tiro-scribe#readme"
  s.license        = package["license"]
  s.author         = "Tiro Scribe"
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: "" }

  # cpp/vendor/ (pinned DSP sources, never committed) is provisioned by this
  # package's postinstall hook: CocoaPods does not run prepare_command for
  # local :path pods, so the fetch must happen at pnpm-install time instead.
  s.static_framework = true

  s.dependency "NitroModules"

  # Vendored C++ headers stay OUT of source_files where possible and are
  # resolved through HEADER_SEARCH_PATHS (Swift's clang importer cannot parse
  # them without C++ interop — only the pod itself compiles them).
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "HEADER_SEARCH_PATHS" => "$(inherited) $(PODS_TARGET_SRCROOT)/cpp/vendor/kaldi-native-fbank $(PODS_TARGET_SRCROOT)/cpp/vendor/eigen $(PODS_TARGET_SRCROOT)/cpp/vendor/kissfft"
  }

  s.source_files = "cpp/*.{h,hpp,cpp,cc}",
                   "cpp/vendor/kaldi-native-fbank/kaldi-native-fbank/csrc/{feature-delta,feature-fbank,feature-functions,feature-mfcc,feature-pitch,feature-raw-audio-samples,feature-window,kaldi-math,mel-computations,online-feature,online-nemo-fbank,resample,rfft,stft,whisper-feature}.cc",
                   "cpp/vendor/kissfft/{kiss_fft,kiss_fftr}.c"

  # Nitrogen
  load "nitrogen/generated/ios/MelSpectrogram+autolinking.rb"
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
