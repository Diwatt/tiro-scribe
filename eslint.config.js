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
            perfectionist 
        },
        rules: {
            // 1. One class per file (disabled per WIP services request)
            'max-classes-per-file': 'off',

            // 2. Member ordering (your exact pattern)
            'perfectionist/sort-classes': ['error', {
                type: 'alphabetical',
                order: 'asc',
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
            }]
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