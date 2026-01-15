#!/bin/bash

# Expo Prebuild Migration Script for Tiro Scribe
# This script automates the migration from bare RN to Expo Prebuild

set -e  # Exit on error

echo "🚀 Starting Expo Prebuild Migration..."

# Phase 1: Install Expo Dependencies
echo ""
echo "📦 Phase 1: Installing Expo dependencies..."
npx install-expo-modules@latest

pnpm add expo@~52.0.0 expo-dev-client@~5.0.0 expo-status-bar@~2.0.0
pnpm add expo-audio@~15.0.0 expo-file-system@~18.0.0
pnpm add expo-build-properties@~0.12.0
pnpm add sherpa-onnx-react-native@^0.10.0

# Remove incompatible whisper.rn
echo "🗑️  Removing whisper.rn..."
pnpm remove whisper.rn || true

# Update React Native libraries to Expo-compatible versions
echo "🔄 Updating React Native libraries to Expo-compatible versions..."
npx expo install react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens

# Install WatermelonDB plugin for SDK 52+ and decorators support
echo "💧 Installing WatermelonDB config plugin for SDK 52+..."
pnpm add -D @lovesworking/watermelondb-expo-plugin-sdk-52-plus @babel/plugin-proposal-decorators

# Install all dependencies
echo "📥 Installing all dependencies..."
pnpm install

echo ""
echo "✅ Phase 1 Complete!"
echo ""

# Phase 2: Clean up
read -p "⚠️  Phase 2 will DELETE android/ and ios/ folders. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

echo ""
echo "🧹 Phase 2: Cleaning up native folders..."
rm -rf android/ ios/
pnpm run clean:metro || true

echo ""
echo "✅ Phase 2 Complete!"
echo ""

# Phase 3: Prebuild
echo "🏗️  Phase 3: Running Expo Prebuild..."
npx expo prebuild --clean

echo ""
echo "✅ Phase 3 Complete!"
echo ""

echo "🎉 Migration Complete!"
echo ""
echo "Next steps:"
echo "1. Review app.json and update EAS project ID if needed"
echo "2. Test Android build: npx expo run:android"
echo "3. Test iOS build: npx expo run:ios"
echo "4. Update your code to use useSecureWorkflow hook"
echo ""
echo "See MIGRATION_GUIDE.md for detailed instructions."
