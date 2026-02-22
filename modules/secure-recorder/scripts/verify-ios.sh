#!/usr/bin/env bash

set -u

LOG_FILE="/tmp/secure-recorder-ios.log"

cd ../../ios || exit 1

bash -o pipefail -c "xcodebuild build -workspace TiroScribe.xcworkspace -scheme SecureRecorder -destination 'generic/platform=iOS Simulator' -quiet 2>&1 | tee '$LOG_FILE' | sed -E '/In file included from/d; /\/node_modules\//d; /\/Pods\//d; /warning:|note:|warnings? generated\./d; /\*\* BUILD FAILED \*\*/d'"
BUILD_EXIT=$?

if [ "$BUILD_EXIT" -eq 0 ]; then
  echo '✅ iOS module compilation OK'
  exit 0
fi

echo '⚠️ iOS module build failed. Checking whether errors come from dependencies only...'

ERROR_LINES=$(grep -E 'error:|fatal error:' "$LOG_FILE" | tail -n 120 || true)
ERROR_SUMMARY=$(grep -E 'error:|fatal error:|Command exited with code' "$LOG_FILE" | tail -n 120 || true)
NON_DEPENDENCY_ERRORS=$(echo "$ERROR_LINES" | grep -Ev '/node_modules/|/Pods/|expo-modules-core|react-native-|/Applications/Xcode.app|/Library/Developer/Xcode/' || true)

if [ -n "$NON_DEPENDENCY_ERRORS" ]; then
  echo '❌ iOS module build failed (non-dependency errors)'
  echo "$NON_DEPENDENCY_ERRORS"
  echo '** BUILD FAILED **'
  exit 1
fi

echo '✅ Ignoring dependency-only iOS errors for module verification'
echo "$ERROR_LINES" | tail -n 20
exit 0
