module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: [
            [
                'babel-preset-expo',
                {
                    // SAFETY: decorators are FORBIDDEN in this codebase (MikroORM uses
                    // defineEntity, zero decorators). Never re-enable the decorator
                    // transform without re-reading TODO.md R1/R5: Hermes native class
                    // fields overwrite decorator-generated accessors on device.
                    // Hermes natively supports classes; the class transform would break
                    // native class semantics — kept stable via this profile (see R1 patch).
                    unstable_transformProfile: 'hermes-stable',
                },
            ],
        ],
        plugins: [
            // Parse-only. Order matters: see TODO.md, règle R1.
            '@babel/plugin-syntax-jsx',
            ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true, allowNamespaces: true }],
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
