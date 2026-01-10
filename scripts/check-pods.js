#!/usr/bin/env node

/**
 * Post-install script to check if CocoaPods dependencies are installed
 * This runs after pnpm install to ensure iOS dependencies are up to date
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iosDir = path.join(__dirname, '..', 'ios');
const podfilePath = path.join(iosDir, 'Podfile');
const podsDir = path.join(iosDir, 'Pods');

// Only run on macOS and if iOS directory exists
if (process.platform !== 'darwin') {
  console.log('⏭️  Skipping CocoaPods check (not on macOS)');
  process.exit(0);
}

if (!fs.existsSync(iosDir)) {
  console.log('⏭️  Skipping CocoaPods check (no iOS directory)');
  process.exit(0);
}

if (!fs.existsSync(podfilePath)) {
  console.log('⏭️  Skipping CocoaPods check (no Podfile found)');
  process.exit(0);
}

// Check if Pods directory exists and is not empty
const podsExist = fs.existsSync(podsDir) && fs.readdirSync(podsDir).length > 0;

// Check if CocoaPods command is available
let podCommandAvailable = false;
try {
  execSync('which pod', { stdio: 'ignore' });
  podCommandAvailable = true;
} catch (error) {
  podCommandAvailable = false;
}

if (!podsExist) {
  if (!podCommandAvailable) {
    console.warn('⚠️  CocoaPods is not installed.');
    console.warn('   Please install CocoaPods first:');
    console.warn('     sudo gem install cocoapods');
    console.warn('   Or using Homebrew:');
    console.warn('     brew install cocoapods');
    console.warn('   Then run: pnpm run pod-install');
    process.exit(0);
  }
  
  console.log('📦 CocoaPods dependencies not found. Installing...');
  try {
    execSync('pod install', {
      cwd: iosDir,
      stdio: 'inherit',
    });
    console.log('✅ CocoaPods dependencies installed successfully');
  } catch (error) {
    console.warn('⚠️  Failed to install CocoaPods dependencies automatically.');
    console.warn('   Please run: pnpm run pod-install');
    // Don't fail the install process
    process.exit(0);
  }
} else {
  console.log('✅ CocoaPods dependencies are already installed');
}
