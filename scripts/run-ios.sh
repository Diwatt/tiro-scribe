#!/bin/bash

# iOS run script that ensures CocoaPods are installed before running

set -e

IOS_DIR="ios"
PODS_DIR="$IOS_DIR/Pods"

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ iOS builds are only supported on macOS"
  exit 1
fi

# Check if iOS directory exists
if [ ! -d "$IOS_DIR" ]; then
  echo "❌ iOS directory not found. Are you sure this is a React Native project?"
  exit 1
fi

# Check if Pods are installed
if [ ! -d "$PODS_DIR" ] || [ -z "$(ls -A $PODS_DIR 2>/dev/null)" ]; then
  echo "📦 CocoaPods dependencies not found. Installing..."
  cd "$IOS_DIR"
  pod install
  cd ..
  echo "✅ CocoaPods dependencies installed"
fi

# Run the iOS app
echo "🚀 Starting iOS app..."
react-native run-ios "$@"
