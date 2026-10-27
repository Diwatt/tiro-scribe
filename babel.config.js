module.exports = function (api) {
    // Cache based on environment variables to ensure Storybook mode works correctly
    api.cache.using(() => process.env.STORYBOOK_ENABLED);
    return {
        presets: [
            [
                'babel-preset-expo',
                {
                    // SAFETY: decorators MUST stay managed by the preset (not a plugins[] entry).
                    // The preset wraps them in its lazy plugins which then also enable the loose
                    // class-properties transform for files with decorated fields. As an explicit
                    // plugins[] entry it runs BEFORE the preset, so the lazy detector never sees
                    // the decorators anymore — decorated entity fields stay native Hermes fields
                    // with define semantics, and Hermes then overwrites the @Column accessors
                    // with undefined (getUuid()/getEmail()/... returned undefined).
                    decorators: { version: '2023-05' },
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
