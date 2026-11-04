// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "SecureRecorder",
  platforms: [
    .iOS(.v17)
  ],
  targets: [
    .target(
      name: "SecureRecorder",
      path: ".",
      exclude: [
        "Tests",
        "SecureRecorderModule.swift",
        "SecureRecorderModule-Bridging-Header.h"
      ]
    ),
    .testTarget(
      name: "SecureRecorderTests",
      dependencies: ["SecureRecorder"],
      path: "Tests",
      exclude: [
        // TODO: Requires an Xcode target linking the ExpoModulesCore pod
        // (the module wraps Session in an Expo ModuleDefinition).
        // It cannot compile inside this SPM package.
        "SecureRecorderModuleTests.swift"
      ]
    )
  ]
)
