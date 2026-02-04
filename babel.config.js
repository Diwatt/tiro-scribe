module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: [['babel-preset-expo', { decorators: false }]],
        plugins: [
            ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
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
                        '@Service': './src/Service',
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
