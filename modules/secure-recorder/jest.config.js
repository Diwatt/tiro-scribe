module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*react-native.*|@react-native|@react-native/.*|@react-native/js-polyfills|@react-native/js-polyfills/.*|@react-native-community|expo|expo-modules-core|@expo|@expo/.*|expo-audio)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/Type/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
