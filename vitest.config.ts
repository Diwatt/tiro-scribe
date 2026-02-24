import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: [path.resolve(__dirname, 'vitest/setup.ts')],
        include: ['./tests/**/*.test.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.d.ts', 'src/**/*.stories.{ts,tsx}'],
        },
    },
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, './src') },
            { find: '@Service', replacement: path.resolve(__dirname, './src/Service') },
            { find: 'expo/fetch', replacement: path.resolve(__dirname, './vitest/mocks/expo-fetch.ts') },
            { find: 'expo/src/winter', replacement: path.resolve(__dirname, './vitest/mocks/expo-winter.js') },
            { find: /^expo$/, replacement: path.resolve(__dirname, './vitest/mocks/expo.js') },
            { find: 'react-native', replacement: path.resolve(__dirname, './vitest/mocks/react-native.js') },
            // alias virtualized-lists (and any subpath) to an empty module to avoid
            // runtime parsing errors from Flow `import typeof` syntax inside the
            // original package.
            {
                find: /^@react-native\/virtualized-lists(?:\/.*)?$/,
                replacement: path.resolve(__dirname, './vitest/mocks/empty-module.js'),
            },
        ],
    },
});
