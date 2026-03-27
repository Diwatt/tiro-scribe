process.env.EXPO_OS = process.env.EXPO_OS || 'ios';
process.env.EXPO_OS = process.env.EXPO_OS || 'ios';
/** @type {import('jest').Config} */
const transformedModules = [
  'expo',
  'expo-asset',
  'expo-audio',
  'expo-clipboard',
  'expo-constants',
  'expo-crypto',
  'expo-dev-client',
  'expo-device',
  'expo-file-system',
  'expo-linking',
  'expo-localization',
  'expo-modules-core',
  'expo-print',
  'expo-router',
  'expo-secure-store',
  'expo-sharing',
  'expo-splash-screen',
  'expo-sqlite',
  '@expo',
  '@expo-google-fonts',
  'react-native',
  '@react-native',
  '@react-native-community',
  '@react-navigation',
  'react-native-paper',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-toast-message',
  'react-native-logs',
  'react-native-get-random-values',
  'react-native-quick-crypto',
  'react-native-nitro-modules',
  'react-native-nitro-sound',
  'react-native-worklets',
  'lucide-react-native',
  'kysely-expo',
  'onnxruntime-react-native',
  '@legendapp/state',
  '@tanstack',
  'msw',
  '@testing-library',
  'secure-recorder',
  'uuid',
].join('|');

module.exports = {
  preset: 'jest-expo',
  // On laisse jest-expo gérer le testEnvironment
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.symbols.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@Service/(.*)$': '<rootDir>/src/Service/$1',
  },

  // Force babel-jest to use the project's root babel.config.js so babel-preset-expo is applied
  // Use the standard project-wide transform for all JS/TS files.
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      { configFile: './babel.config.js' },
    ],
  },

  // Use a pnpm-aware transformIgnorePatterns that allows transforming packages
  // installed under the pnpm store layout (node_modules/.pnpm/.../node_modules/<pkg>/...)
  transformIgnorePatterns: [
    `node_modules/(?!(?:\\.pnpm/.+?/node_modules/)?(${transformedModules})/)`,
  ],

  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageReporters: ['text', 'lcov'],
};
