module.exports = {
    preset: 'jest-expo',
    testEnvironment: 'node',
    transformIgnorePatterns: [
        'node_modules/(?!(.*react-native.*|@react-native|@react-native/.*|@react-native/js-polyfills|@react-native/js-polyfills/.*|@react-native-community|expo|expo-modules-core|@expo|@expo/.*|react-navigation|@react-navigation|@react-navigation/.*|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@legendapp/state|better-sqlite3|drizzle-orm)/)',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@Service/(.*)$': '<rootDir>/src/Service/$1',
        '^@Entity/(.*)$': '<rootDir>/src/Entity/$1',
        '^@Model/(.*)$': '<rootDir>/src/Model/$1',
        '^@Util/(.*)$': '<rootDir>/src/Util/$1',
        '^@Store/(.*)$': '<rootDir>/src/Store/$1',
        '^@Navigation/(.*)$': '<rootDir>/src/Navigation/$1',
        '^@Recording/(.*)$': '<rootDir>/src/Recording/$1',
    },
    setupFiles: [],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{ts,tsx}',
    ],
    testMatch: ['**/tests/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    testPathIgnorePatterns: ['/node_modules/', '/modules/secure-recorder/'],
};
