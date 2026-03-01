import biome from 'eslint-config-biome';
import plugin from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import perfectionist from 'eslint-plugin-perfectionist';

export default [
    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: { 
            '@typescript-eslint': plugin,
            perfectionist 
        },
        rules: {
            // 1. One class per file
            'max-classes-per-file': ['error', 1],

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
            }],
            'no-magic-numbers': ['warn', {
                ignore: [0, 1, -1],
                ignoreArrayIndexes: true,
                ignoreDefaultValues: true,
                enforceConst: true,
            }],
        },
    },
    {
        files: ['tests/**/*.ts', 'tests/**/*.tsx', 'vitest/**/*.ts', '**/*.test.ts', '**/*.test.tsx'],
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
            // Disable rules that conflict with test files
            'no-magic-numbers': 'off',
            '@typescript-eslint/no-restricted-types': 'off',
            'max-classes-per-file': 'off',
        },
    },
    // Last: disable anything Biome already covers
    biome,
];