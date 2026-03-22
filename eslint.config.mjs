/**
 * ESM ESLint configuration (module) to avoid Node reparsing warnings when tools
 * attempt to load `eslint.config.js` without `"type": "module"` in package.json.
 *
 * This file mirrors the project's existing ESLint rules but is exported as an
 * ES module (`.mjs`) so Node will parse it as ESM directly and avoid the
 * "MODULE_TYPELESS_PACKAGE_JSON" reparsing warning.
 *
 * Keep in sync with `eslint.config.js`.
 */

import biome from 'eslint-config-biome';
import plugin from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import perfectionist from 'eslint-plugin-perfectionist';

export default [
    {
        ignores: [
            'src/Service/Anonymizer.ts',
            'src/Service/AudioPipelineAdapter.ts',
            'src/Service/AudioProcessing.ts',
            'src/Service/AudioRecording.ts',
            'modules/**/build/**',
        ],
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
    },
    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        plugins: { 
            '@typescript-eslint': plugin,
            perfectionist,
        },
        rules: {
            // 1. One class per file (disabled per WIP services request)
            'max-classes-per-file': 'off',

            // 2. Member ordering (grouping only, no alphabetical sorting)
            'perfectionist/sort-classes': ['error', {
                type: 'unsorted',
                groups: [
                    'static-property',
                    'property',
                    'constructor',
                    'public-method',
                    'protected-method',
                    'private-method',
                ],
            }],

            // 3. Ban React.FC
            '@typescript-eslint/no-restricted-types': ['error', {
                types: {
                    'React.FC': 'Use `function X(props: Props): React.JSX.Element` instead.',
                    'React.FunctionComponent': 'Use `function X(props: Props): React.JSX.Element` instead.',
                },
            }],
        },
    },
    {
        files: ['tests/**/*.ts', 'tests/**/*.tsx', 'vitest/**/*.ts', '**/*.test.ts', '**/*.test.tsx', 'stories/**/*.ts', 'stories/**/*.tsx'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: { 
            '@typescript-eslint': plugin,
        },
        rules: {
            '@typescript-eslint/no-restricted-types': 'off',
            'max-classes-per-file': 'off',
        },
    },
    // Last: disable anything Biome already covers
    biome,
];