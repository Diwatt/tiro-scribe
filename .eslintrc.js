module.exports = {
    root: true,
    extends: '@react-native',
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/no-shadow': ['error'],
                'no-shadow': 'off',
                'no-undef': 'off',
                // Note: For strict directory naming enforcement, consider using
                // a pre-commit hook or custom script. ESLint 8 doesn't have
                // built-in directory naming rules without additional plugins.
                // The project structure should follow:
                // - All directories: PascalCase, Singular
                // - Hook files: PascalCase without "Use" prefix (e.g., AudioRecording.ts)
                // - Component/Service files: PascalCase
            },
        },
    ],
};
