# Migration to Latest React Native, Expo, and Hermes-Only Configuration

## Overview
This document outlines the migration plan to update Tiro Scribe to the latest React Native (0.85.1), Expo (55.x), and Hermes-only configuration as specified in `.roo/rules/tech-stack.md`.

## Migration Summary

### Completed Changes

#### 1. Core Dependency Updates
- **Expo SDK**: Updated from `~54.0.33` to `~55.0.0`
- **React Native**: Updated from `0.84.0` to `0.85.1`
- **React**: Updated from `19.2.4` to `19.3.0`
- **Expo modules**: All updated to latest compatible versions (13.x-20.x range)
- **React Native gesture/screen libraries**: Updated to latest versions (3.x-6.x range)

#### 2. Platform Configuration Updates
**Android Configuration (`android/app/build.gradle` and `app.json`):**
- Set `minSdkVersion` from 28 to **29** (Android 10)
- Set `targetSdkVersion` and `compileSdkVersion` to **35**
- Enabled Hermes explicitly: `hermesEnabled = true`
- Removed JSC (JavaScriptCore) fallback implementation
- Added `buildConfigField "boolean", "HERMES_ENABLED", "true"`
- Set `REACT_NATIVE_RELEASE_LEVEL` to `"stable"`
- Removed unnecessary storage permissions (READ/WRITE_EXTERNAL_STORAGE)

**iOS Configuration (`ios/Podfile` and `app.json`):**
- Set deployment target from `15.1` to **16.0**
- Enabled Hermes explicitly: `:hermes_enabled => true`
- Set `jsEngine: "hermes"` in app.json

**SecureRecorder Native Module (`modules/secure-recorder/expo-module.config.json`):**
- Updated iOS deployment target to **16.0**
- Updated Android minSdkVersion to **29**

#### 3. Hermes-Only Enforcement
- Removed all JSC/V8 fallback code paths
- Updated error messages to reflect Hermes-only environment
- Removed conditional compilation for non-Hermes engines
- Updated decorator metadata handling to assume Hermes availability

#### 4. Code Cleanup
- Removed web compatibility references in error handling
- Updated error messages to remove V8/JSC references
- Enforced Hermes-only assumptions in decorator metadata system
- Removed conditional logic for non-Hermes environments

## Migration Steps Performed

### 1. Dependency Updates (`package.json`)
```diff
-    "expo": "~54.0.33",
-    "react-native": "0.84.0",
-    "react": "19.2.4",
+    "expo": "~55.0.0",
+    "react-native": "0.85.1",
+    "react": "19.3.0",
```

### 2. Android Configuration (`android/app/build.gradle`)
```diff
android {
    defaultConfig {
-        minSdkVersion rootProject.ext.minSdkVersion
-        targetSdkVersion rootProject.ext.targetSdkVersion
+        minSdkVersion 29
+        targetSdkVersion 35
         versionCode 1
         versionName "0.1.0"
 
+        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", '"stable"'
+        buildConfigField "boolean", "HERMES_ENABLED", "true"
    }
}

dependencies {
-    if (hermesEnabled.toBoolean()) {
-        implementation("com.facebook.react:hermes-android")
-    } else {
-        implementation jscFlavor
-    }
+    // Hermes-only configuration as per tech stack requirements
+    implementation("com.facebook.react:hermes-android")
}
```

### 3. iOS Configuration (`ios/Podfile`)
```diff
-  use_react_native!(
-    :path => config[:reactNativePath],
-    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
+  use_react_native!(
+    :path => config[:reactNativePath],
+    :hermes_enabled => true,
```

### 4. Expo Configuration (`app.json`)
```diff
"android": {
-    "permissions": ["android.permission.RECORD_AUDIO", "android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE"]
+    "permissions": ["android.permission.RECORD_AUDIO"],
+    "jsEngine": "hermes"
},
"ios": {
+    "jsEngine": "hermes"
},
"plugins": [
    [
        "expo-build-properties",
        {
+            "hermesEnabled": true,
            "android": {
+                "hermesEnabled": true,
                "minSdkVersion": 29,
```

### 5. Hermes-Only Code Enforcement
**Error Handling Updates:**
```diff
-        // Maintains proper stack trace for where our error was thrown (only available on V8)
+        // Maintains proper stack trace for where our error was thrown (Hermes-only)
```

**Decorator Metadata Updates:**
```diff
-        // Hermes-only: Symbol.metadata is always available
-        if (!Symbol.metadata) {
-            // This should never happen in Hermes with Stage 3 decorators
-            return undefined;
-        }
+        // Hermes-only: Symbol.metadata is always available
+        if (!Symbol.metadata) {
+            throw new DecoratorException(
+                'Symbol.metadata is not available. This should never happen in Hermes with Stage 3 decorators.',
+                'METADATA_UNAVAILABLE'
+            );
+        }
```

## Validation Plan

### 1. Build Validation
- [ ] Run `pnpm clean` to clear all caches
- [ ] Run `pnpm install` to install updated dependencies
- [ ] Run `pnpm pods:install` to update iOS pods
- [ ] Verify Android build: `pnpm android`
- [ ] Verify iOS build: `pnpm ios`

### 2. Runtime Validation
- [ ] Verify Hermes engine is active (check `global.HermesInternal`)
- [ ] Test audio recording functionality
- [ ] Test SecureRecorder native module integration
- [ ] Test database operations
- [ ] Test on-device AI processing
- [ ] Test all app flows (onboarding, recording, settings)

### 3. Platform-Specific Validation
**Android:**
- [ ] Verify minSdkVersion 29 enforcement
- [ ] Verify Hermes engine is used (no JSC fallback)
- [ ] Test on Android 10+ devices

**iOS:**
- [ ] Verify iOS 16.0+ deployment target
- [ ] Verify Hermes engine is used
- [ ] Test on iOS 16+ devices

## Potential Issues and Mitigations

### 1. Native Module Compatibility
- **Issue**: SecureRecorder module may need updates for new deployment targets
- **Mitigation**: Verify module compatibility and update native code as needed

### 2. Dependency Conflicts
- **Issue**: Updated dependencies may have compatibility issues
- **Mitigation**: Run `pnpm why <dependency>` to identify conflicts and resolve version mismatches

### 3. Hermes-Specific Behavior
- **Issue**: Some JavaScript patterns may behave differently in Hermes
- **Mitigation**: Test all critical app flows and monitor for Hermes-specific issues

### 4. Build System Changes
- **Issue**: Updated Gradle and Xcode configurations may introduce build issues
- **Mitigation**: Monitor build logs for warnings/errors and address platform-specific issues

## Post-Migration Tasks

1. **Performance Testing**: Verify that Hermes engine provides expected performance benefits
2. **Memory Profiling**: Ensure memory usage is within expected ranges for on-device AI processing
3. **Compatibility Testing**: Test on various devices meeting the new minimum requirements
4. **Documentation Updates**: Update README and contribution guidelines with new requirements
5. **CI/CD Pipeline**: Update GitHub Actions and other CI workflows with new build requirements

## Compatibility Matrix

| Component               | Previous Version | New Version | Notes                          |
|-------------------------|------------------|-------------|--------------------------------|
| React Native            | 0.84.0           | 0.85.1      |                                |
| Expo SDK                | 54.x             | 55.x        |                                |
| Android minSdkVersion   | 28               | 29          | Android 10+ required           |
| iOS deployment target   | 15.1             | 16.0        | iOS 16+ required               |
| Hermes Engine           | Optional         | Required    | No JSC fallback                |
| React                   | 19.2.4           | 19.3.0      |                                |
| React Native Paper      | 5.15.0           | 5.15.0      | No update available            |
| React Navigation        | 7.x              | 7.x         | No major updates required      |

## Files Modified

### Core Configuration Files
- `package.json` - Dependency updates
- `app.json` - Expo configuration
- `android/app/build.gradle` - Android build configuration
- `ios/Podfile` - iOS build configuration

### Native Module Configuration
- `modules/secure-recorder/expo-module.config.json` - Native module targets

### Code Files
- `src/Exception/TiroScribeException.ts` - Hermes-only error handling
- `src/Decorator/MetadataReader.ts` - Hermes-only decorator metadata
- `src/Decorator/MetadataWriter.ts` - Hermes-only decorator metadata
- `src/Database/Decorator/Entity.ts` - Hermes-only metadata validation

### Documentation
- `docs/migration-to-latest-rn-expo-hermes.md` - This migration document