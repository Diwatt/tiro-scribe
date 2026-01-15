# Android SDK Setup

React Native 0.76 requires **Android SDK Platform 35** (Android 15.0 - VanillaIceCream).

## Current Status
- ✅ ANDROID_HOME is configured
- ✅ Build Tools 36.1.0 installed
- ✅ SDK Platform 36 installed
- ❌ SDK Platform 35 **needs to be installed**

## Installation Steps

### Option 1: Using Android Studio (Recommended)

1. Open **Android Studio**
2. Go to **Tools → SDK Manager** (or **Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK**)
3. In the **"SDK Platforms"** tab:
   - Check **"Android 15.0 (VanillaIceCream)"** - API Level 35
4. In the **"SDK Tools"** tab:
   - Expand **"Android SDK Build-Tools"**
   - Check **"35.0.0"** (you currently have 36.1.0, but RN 0.76 expects 35.0.0)
5. Click **"Apply"** to install

### Option 2: Using Command Line (if you have Android SDK command-line tools)

```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-35" "build-tools;35.0.0"
```

## Verify Installation

After installation, verify with:

```bash
ls ~/Library/Android/sdk/platforms/
# Should show: android-35 and android-36

ls ~/Library/Android/sdk/build-tools/
# Should show: 35.0.0 and 36.1.0
```

Then run React Native doctor again:

```bash
npx react-native doctor
```

## Note

Your `build.gradle` is configured for SDK 35, which matches React Native 0.76's requirements. Once you install SDK Platform 35, the React Native doctor should pass all Android checks.
