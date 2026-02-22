# Build and Compilation Guide

This guide provides comprehensive instructions for cleaning, building, and compiling the Tiro Scribe application for both iOS and Android platforms, including the secure-recorder native module.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Clean Build Process](#clean-build-process)
4. [Secure Recorder Module](#secure-recorder-module)
5. [Full Application Build](#full-application-build)
6. [Troubleshooting](#troubleshooting)
7. [Platform-Specific Notes](#platform-specific-notes)

## Prerequisites

Before starting, ensure you have the following installed:

### Core Tools
- **Node.js** 18+ (recommended: LTS version)
- **pnpm** 8+ (package manager)
- **Git** (version control)

### iOS Development
- **Xcode** 15+ (with Command Line Tools)
- **CocoaPods** 1.13+
- **iOS Simulator** or physical device with iOS 16+

### Android Development
- **Android Studio** (with SDK Platform Tools)
- **Java Development Kit** (JDK) 17+
- **Android SDK** with API level 33+
- **Android Emulator** or physical device with Android 10+

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd tiro-scribe

# Install dependencies
pnpm install

# Install iOS pods (from project root)
cd ios && pod install
```

## Project Structure

```
tiro-scribe/
├── modules/secure-recorder/     # Native module (iOS/Android)
├── ios/                         # iOS native code
├── android/                     # Android native code
├── src/                         # TypeScript/React Native source
├── package.json                 # Dependencies and scripts
└── docs/                        # Documentation
```

## Clean Build Process

### Complete Clean (Nuclear Option)
Use this when experiencing persistent build issues:

```bash
# From project root
pnpm run clean
```

This command executes:
1. Cleans Metro bundler cache
2. Removes node_modules/.cache
3. Deletes .expo directory
4. Cleans iOS build artifacts (Pods, DerivedData)
5. Cleans Android build artifacts (.gradle, build directories)
6. Reinstalls dependencies
7. Reinstalls iOS pods

### Platform-Specific Clean

#### iOS Clean
```bash
# Clean iOS specific artifacts
cd ios
pod deintegrate
pod cache clean --all
rm -rf Pods Podfile.lock build DerivedData
cd ..

# Alternative using project script
pnpm run pods:clean
```

#### Android Clean
```bash
# Clean Android specific artifacts
cd android
./gradlew clean
rm -rf .gradle build app/build
cd ..
```

#### JavaScript/TypeScript Clean
```bash
# Clean JavaScript/TypeScript artifacts
rm -rf node_modules/.cache .expo /tmp/metro-* $TMPDIR/metro-*
pnpm install
```

## Secure Recorder Module

The secure-recorder is a native Expo module that provides secure audio recording with AES-256-GCM encryption.

### Module Structure
```
modules/secure-recorder/
├── src/                         # TypeScript interface
├── ios/                         # iOS native implementation
├── android/                     # Android native implementation
├── SecureRecorder.podspec       # iOS pod specification
└── package.json                 # Module dependencies
```

### Building the Module

#### Development Build
```bash
# Build TypeScript interface
cd modules/secure-recorder
pnpm run build

# Or from project root
pnpm run module:build
```

#### Verification (Recommended before commits)
```bash
# Run comprehensive verification
cd modules/secure-recorder
pnpm run verify
```

This executes:
- TypeScript type checking
- Linting
- Module structure validation
- Android compilation tests
- iOS compilation tests

#### Platform-Specific Module Build

##### iOS Module
```bash
# Build iOS module
cd modules/secure-recorder
pnpm run build:ios

# Or test iOS compilation
pnpm run verify:ios
```

##### Android Module
```bash
# Build Android module
cd modules/secure-recorder
pnpm run build:android

# Or test Android compilation
pnpm run verify:android
```

### Module Testing
```bash
# Run all module tests
cd modules/secure-recorder
pnpm run test:unit

# Platform-specific tests
pnpm run test:android
pnpm run test:ios
```

## Full Application Build

### Development Builds

#### iOS Development
```bash
# Start iOS development build
pnpm run ios

# Alternative: Open in Xcode
pnpm run ios:xcode

# Clean build (recommended after dependency changes)
pnpm run preios && pnpm run ios
```

#### Android Development
```bash
# Start Android development build
pnpm run android

# View logs
pnpm run android:logcat
```

### Production Builds

#### iOS Production
```bash
# Prebuild (generates native projects)
pnpm run prebuild

# Clean prebuild
pnpm run prebuild:clean

# Build for distribution (requires Xcode)
# 1. Open ios/TiroScribe.xcworkspace in Xcode
# 2. Select Product → Archive
# 3. Follow distribution workflow
```

#### Android Production
```bash
# Generate APK/AAB
cd android
./gradlew assembleRelease

# Generate debug APK
./gradlew assembleDebug

# Location of generated files:
# - APK: android/app/build/outputs/apk/release/
# - AAB: android/app/build/outputs/bundle/release/
```

### Expo Build Service (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both platforms
eas build --platform all
```

## Troubleshooting

### Common Issues and Solutions

#### 1. iOS Pod Installation Failures
**Symptoms**: `pod install` fails with dependency errors

**Solutions**:
```bash
# Update CocoaPods repository
pod repo update

# Clean pod cache
pod cache clean --all

# Reintegrate pods
cd ios
pod deintegrate
pod install --repo-update
```

#### 2. Metro Bundler Cache Issues
**Symptoms**: JavaScript changes not reflecting, random bundler errors

**Solutions**:
```bash
# Reset Metro cache
pnpm run clean:metro

# Alternative manual cleanup
rm -rf /tmp/metro-* $TMPDIR/metro-* node_modules/.cache .expo
```

#### 3. Native Module Compatibility Issues
**Symptoms**: Build errors mentioning `CallInvoker`, `RCT-Folly`, or missing headers

**Solutions**:
1. Ensure compatible versions in `package.json`:
   - `expo-modules-core`: ^2.5.0 (for Expo 54)
   - `react-native-reanimated`: 3.8.0
   - `react-native-worklets`: 0.4.0
   - `react-native-screens`: 3.20.0

2. Verify New Architecture configuration in `ios/Podfile.properties.json`:
   ```json
   {
     "newArchEnabled": "true",
     "ios.deploymentTarget": "16.0"
   }
   ```

#### 4. Android Gradle Build Failures
**Symptoms**: Gradle sync failures, missing SDK components

**Solutions**:
```bash
# Clean Gradle cache
cd android
./gradlew clean
rm -rf .gradle

# Update Gradle wrapper (if needed)
./gradlew wrapper --gradle-version=8.5
```

### Debugging Tools

#### Logging
```bash
# iOS logs
pnpm run ios  # View in terminal
# Or use Console.app on macOS

# Android logs
pnpm run android:logcat
# Or use Android Studio Logcat
```

#### Performance Monitoring
```bash
# Start React Native debugger
npx react-devtools

# Hermes debugger (if using Hermes)
open "hermes-devtools://devtools?app=localhost:8081"
```

## Platform-Specific Notes

### iOS Specific

#### New Architecture Requirements
- Requires Xcode 15+
- Requires iOS deployment target 16.0+
- Enable in `ios/Podfile.properties.json`:
  ```json
  {
    "newArchEnabled": "true",
    "ios.useFrameworks": "static"
  }
  ```

#### Code Signing
1. Open `ios/TiroScribe.xcworkspace` in Xcode
2. Select the TiroScribe target
3. Go to Signing & Capabilities
4. Select your development team
5. Ensure bundle identifier is unique

### Android Specific

#### Gradle Configuration
- Minimum SDK: 29 (Android 10)
- Target SDK: 35 (Android 15)
- Compile SDK: 35

#### Keystore Setup (Production)
```bash
# Generate keystore (first time only)
keytool -genkey -v -keystore tiro-scribe.keystore \
  -alias tiro-scribe -keyalg RSA -keysize 2048 -validity 10000

# Configure in android/gradle.properties
MYAPP_RELEASE_STORE_FILE=tiro-scribe.keystore
MYAPP_RELEASE_KEY_ALIAS=tiro-scribe
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

## Maintenance Scripts

The project includes several maintenance scripts in `package.json`:

### Regular Maintenance
```bash
# Weekly maintenance routine
pnpm run clean           # Full clean
pnpm install             # Fresh dependencies
cd ios && pod install    # Fresh pods
pnpm run type-check      # Verify TypeScript
pnpm run test            # Run tests
```

### Pre-commit Checklist
```bash
# Run before committing changes
pnpm run type-check      # TypeScript compilation
pnpm run lint            # Code style check
pnpm run test            # Unit tests
cd modules/secure-recorder && pnpm run verify  # Module verification
```

## Version Compatibility Matrix

| Package | Version | Notes |
|---------|---------|-------|
| Expo | 54.0.33 | Latest stable for React Native 0.84.0 |
| React Native | 0.84.0 | Compatible with Expo 54 |
| react-native-reanimated | 3.8.0 | Compatible with New Architecture on RN 0.84.0 |
| react-native-worklets | 0.4.0 | Compatible with reanimated 3.8.0 |
| react-native-screens | 3.20.0 | Compatible with New Architecture on RN 0.84.0 |
| expo-modules-core | ^2.5.0 | Required for secure-recorder compatibility |

## Support

For additional support:
1. Check existing issues in the repository
2. Review Expo documentation: https://docs.expo.dev/
3. Consult React Native troubleshooting guide
4. Contact the development team for project-specific issues

---

*Last Updated: $(date)*  
*Maintained by: Tiro Scribe Development Team*