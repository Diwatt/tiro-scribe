const {getDefaultConfig} = require('expo/metro-config');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Configure Metro to handle .sql files for Drizzle migrations
// This allows Metro to recognize and bundle SQL migration files
config.resolver.sourceExts.push('sql');

// Only wrap with Storybook when explicitly enabled
const isStorybookEnabled = process.env.STORYBOOK_ENABLED === 'true';

if (isStorybookEnabled) {
    const {withStorybook} = require('@storybook/react-native/metro/withStorybook');
    module.exports = withStorybook(config, {
        enabled: true,
    });
} else {
    module.exports = config;
}
