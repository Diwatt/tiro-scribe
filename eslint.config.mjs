import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

export default [
    {
        ignores: ['node_modules/**', 'dist/**', 'build/**', '.expo/**', 'android/**', 'ios/**'],
    },
    ...compat.extends('@react-native'),
    {
        files: ['eslint.config.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    },
    {
        files: ['*.ts', '*.tsx'],
        languageOptions: {
            parser: (await import('@typescript-eslint/parser')).default,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default,
        },
        rules: {
            '@typescript-eslint/no-shadow': 'error',
            'no-shadow': 'off',
            'no-undef': 'off',
            // Note: For strict directory naming enforcement, consider using
            // a pre-commit hook or custom script. ESLint 9 doesn't have
            // built-in directory naming rules without additional plugins.
            // The project structure should follow:
            // - All directories: PascalCase, Singular
            // - Hook files: PascalCase without "Use" prefix (e.g., AudioRecording.ts)
            // - Component/Service files: PascalCase
        },
    },
    {
        files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js', '**/*.spec.ts', '**/*.spec.tsx', '**/__tests__/**/*'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
];
