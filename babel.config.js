module.exports = {
    presets: ['module:@react-native/babel-preset'],
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
