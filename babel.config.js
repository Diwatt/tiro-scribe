module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                '@babel/plugin-proposal-decorators',
                {
                    legacy: true,
                },
            ],
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
                        '@Model': './src/Model',
                        '@Util': './src/Util',
                        '@Store': './src/Store',
                        '@Navigation': './src/Navigation',
                        '@Recording': './src/Recording',
                    },
                },
            ],
            'react-native-reanimated/plugin',
        ],
    };
};
