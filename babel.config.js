module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: [['babel-preset-expo', { decorators: false }]],
        plugins: [
            ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
            // Required: the 2023-05 decorator transform emits static class-block
            // syntax internally; this plugin must follow the decorators plugin so
            // Babel can parse and lower those blocks for Node/Jest environments.
            '@babel/plugin-transform-class-static-block',
            // Transform dynamic import() calls to require() in Jest/Node (CJS) mode
            // so that `await import('module')` works without --experimental-vm-modules.
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
