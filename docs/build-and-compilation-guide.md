# Build & Compilation Guide

This document walks through the **entire build process** from a clean
checkout up through running the app on a device or simulator.  We emphasise
the three most‑common actions:

1. clear the workspace
2. build the native `secure-recorder` module
3. compile & launch the app

Sections later in the file provide extra details (prebuilds, verification,
release builds, etc.) but the "happy path" is just those three steps.

---

## 1. Preparation (first time only)

Run these once after cloning the repository or whenever dependencies change:

```bash
bun install                   # install JS packages in root + workspaces
bun run pods:install          # install CocoaPods for the iOS project
```

> You can skip `pods:install` on Android – the Gradle build will handle
> dependencies automatically.

Once this is done you have a working development environment but **no
native modules are compiled yet**.

---

## 2. Clear everything (optional but useful)

If you suspect stale artifacts are causing build failures, perform a full
clean before continuing.  This step is safe to run at any time and is the
recommended starting point for CI pipelines.

```bash
bun run clean
```

The `clean` script does the following:

- wipes Metro/haste caches (`/tmp/metro-*`, etc.)
- removes `.expo`, build folders, and other JS artifacts
- deletes generated iOS/Android build output
- reinstalls node_modules and iOS pods

Run it when your build is "wonky" or after switching branches that added
native code.

---

## 3. Build the `secure-recorder` native module

The custom Expo module is written in TypeScript and compiled separately from
the main app.  You should rebuild it whenever you modify code under
`modules/secure-recorder`.

### quick one‑time compile

```bash
bun run module:build       # from project root
```

This compiles the module sources and exits.  It is **not** a watch mode; use
only for CI or manual checks.

### manual alternative (inside module folder)

```bash
cd modules/secure-recorder
bunx expo-module tsc -p tsconfig.json
```

### verify the build (high confidence)

```bash
cd modules/secure-recorder
bun run verify             # runs both TypeScript and native tests
```

Native‑only checks are available too:

```bash
cd modules/secure-recorder
bun run verify:android
bun run verify:ios
```

> **Important:** if the native module is not compiled & linked, the
> runtime error `Cannot find native module 'SecureRecorder'` will occur
> when the app attempts to use it.  That is the same failure you see
> when running with Expo Go – the module simply isn't present.

---

## 4. Regenerate & build the app (development builds)

After cleaning and building the native module, you are ready to create a
**development build** that includes all custom code.  The npm scripts wrap the
corresponding `expo` commands:

```bash
# iOS development client (runs `expo run:ios` under the hood)
bun run ios:dev

# Android development client
bun run android:dev
```

These commands will:

1. run a prebuild if the native projects are out of date
2. add any new Expo modules (including `secure-recorder`)
3. compile and install the app on a simulator/device

You can also explicitly regenerate the native folders beforehand:

```bash
bun run prebuild           # normal regeneration
bun run prebuild:clean     # force a clean regen of ios/ and android/
```

Typically you only need `prebuild` if you've edited `app.json` or added a
new native dependency.

Once the development client is running you may `expo start` the bundle
but always install the binary produced by `run:ios`/`run:android` rather than
using Expo Go.

---

## 5. Release & other advanced tasks

### Android release APK/AAB

```bash
cd android
./gradlew assembleRelease
```

### iOS archive

1. Open `ios/TiroScribe.xcworkspace` in Xcode
2. Select **Product → Archive**
3. Export via the Organizer window

---

## 6. Troubleshooting quick recipe

When a build error occurs, follow this sequence:

```bash
bun run clean
bun run module:build
bun run ios:dev    # or bun run android:dev
```

If an iOS build still fails, try:

```bash
bun run pods:clean
bun run ios:dev
```

Those three steps – **clean, build native, run app** – resolve the vast
majority of issues.

---

Keep this file bookmarked; it's the shortest path from a pristine clone to a
running development client with the secure‑recorder module included.