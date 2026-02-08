const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Pnpm workspace specific configuration
// We need to tell Metro about the workspace root node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Enable symlink support for pnpm
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

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
