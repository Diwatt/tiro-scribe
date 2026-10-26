const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Pnpm workspace specific configuration
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Symlink support is built into @expo/metro-config since SDK 56.
config.resolver.unstable_enablePackageExports = true;

// Allow ONNX model files to be bundled as assets
config.resolver.assetExts.push('onnx', 'ort');

// Only wrap with Storybook when explicitly enabled
const isStorybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

if (isStorybookEnabled) {
    const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
    module.exports = withStorybook(config, {
        enabled: true,
    });
} else {
    module.exports = config;
}
