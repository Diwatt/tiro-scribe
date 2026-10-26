module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: [
            [
                'babel-preset-expo',
                {
                    decorators: false,
                    // Hermes natively supports classes; the class transform would destroy
                    // the _initClass blocks emitted by the 2023-05 decorator transform.
                    unstable_transformProfile: 'hermes-stable',
                },
            ],
        ],
        plugins: [
            // Parse-only. Order matters: see TECH.md §0.2.
            '@babel/plugin-syntax-jsx',
            ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true, allowNamespaces: true }],
            ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
            '@babel/plugin-transform-class-static-block',
            ...(process.env.NODE_ENV === 'test' ? ['babel-plugin-dynamic-import-node'] : []),
            [
                'module-resolver',
                {
                    root: ['./src'],
                    extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
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
