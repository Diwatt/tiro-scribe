module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['./src'],
                    extensions: [
                        '.ios.js',
                        '.android.js',
                        '.js',
                        '.ts',
                        '.tsx',
                        '.json',
                    ],
                    alias: {
                        '@': './src',
                        '@Entity': './src/Entity',
                        '@Service': './src/Service',
                        '@Model': './src/Model',
                        '@Util': './src/Util',
                        '@Store': './src/Store',
                        '@Navigation': './src/Navigation',
                        '@Recording': './src/Recording',
                    },
                },
            ],
            // Inline environment variables at build time
            [
                'transform-inline-environment-variables',
                {
                    include: ['STORYBOOK_ENABLED'],
                },
            ],
            'react-native-reanimated/plugin',
        ],
    };
};
