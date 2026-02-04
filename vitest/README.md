# Vitest mocks

Used only when running `pnpm test` (Vitest). See `vitest.config.ts` → `resolve.alias`.

- **`mocks/expo.js`** – stub for `import … from 'expo'`
- **`mocks/expo-winter.js`** – stub for `import … from 'expo/src/winter'`

The real Expo package is ESM and fails in Node. These stubs export `{}`. Runtime mocks (expo-audio, Legend-State, etc.) are in `vitest.setup.ts`.
