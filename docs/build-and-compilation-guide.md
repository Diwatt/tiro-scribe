# Build Guide (Simple)

This guide is intentionally short and focused on 3 tasks:
1. Build from scratch
2. Clean and rebuild `secure-recorder`
3. Run full app builds (iOS/Android)

## 1) Build From Scratch

Run from project root:

```bash
pnpm install
pnpm run pods:install
```

Then start a platform build:

```bash
# iOS
pnpm run ios

# Android
pnpm run android
```

## 2) Clean Everything (Recommended if build is unstable)

Run from project root:

```bash
pnpm run clean
```

What this does (via script):
- Clears Metro cache
- Removes JS/Expo/iOS/Android build artifacts
- Reinstalls dependencies
- Reinstalls iOS pods

## 3) Build `secure-recorder` Module

Preferred (from project root):

```bash
pnpm run module:build
```

This is a one-shot build (no watch mode). It compiles the module TypeScript and exits.

Alternative (inside module folder):

```bash
cd modules/secure-recorder
pnpm exec expo-module tsc -p tsconfig.json
```

Do not use `pnpm run build:watch` for CI/manual build checks.

Recommended full module verification:

```bash
cd modules/secure-recorder
pnpm run verify
```

Native-only verification:

```bash
cd modules/secure-recorder
pnpm run verify:android
pnpm run verify:ios
```

## 4) Full Application Build

### Development Build

```bash
# iOS dev build
pnpm run ios

# Android dev build
pnpm run android
```

### Prebuild (Regenerate native projects)

```bash
# Generate native ios/android folders from Expo config
pnpm run prebuild

# Same, but with clean regeneration
pnpm run prebuild:clean
```

### Release Build

```bash
# Android release artifacts
cd android
./gradlew assembleRelease
```

For iOS release, archive in Xcode:
1. Open `ios/TiroScribe.xcworkspace`
2. Select Product → Archive
3. Export through Xcode Organizer

## 5) Minimal Troubleshooting

If a build fails, run this order:

```bash
pnpm run clean
pnpm run module:build
pnpm run ios    # or pnpm run android
```

If iOS still fails:

```bash
pnpm run pods:clean
pnpm run ios
```