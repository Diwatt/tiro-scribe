module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: [
            [
                'babel-preset-expo',
                {
                    decorators: false,
                    // Force Hermes detection so @react-native/babel-preset skips
                    // plugin-transform-classes, which destroys the _initClass static
                    // blocks emitted by the 2023-05 decorator transform.
                    unstable_transformProfile: 'hermes-stable',
                },
            ],
        ],
        plugins: [
            ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
            // The 2023-05 decorator transform emits static class-block syntax.
            // This plugin lowers those blocks to IIFEs so the runtime can execute them.
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
