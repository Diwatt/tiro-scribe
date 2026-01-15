#!/bin/bash
# Script to install required Android SDK components for React Native 0.76

echo "Installing Android SDK Platform 35 and Build Tools 35.0.0..."
echo ""
echo "Please run this command in Android Studio's SDK Manager, or use the following:"
echo ""
echo "1. Open Android Studio"
echo "2. Go to Tools → SDK Manager"
echo "3. In the 'SDK Platforms' tab:"
echo "   - Check 'Android 15.0 (VanillaIceCream)' - API Level 35"
echo "4. In the 'SDK Tools' tab:"
echo "   - Expand 'Android SDK Build-Tools'"
echo "   - Check '35.0.0'"
echo "5. Click 'Apply' to install"
echo ""
echo "Alternatively, if you have Android SDK command-line tools installed, run:"
echo "  sdkmanager 'platforms;android-35' 'build-tools;35.0.0'"
echo ""
