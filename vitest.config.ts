import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
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
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@Service': path.resolve(__dirname, './src/Service'),
            'expo': path.resolve(__dirname, './vitest/mocks/expo.js'),
            'expo/src/winter': path.resolve(__dirname, './vitest/mocks/expo-winter.js'),
        },
    },
});
