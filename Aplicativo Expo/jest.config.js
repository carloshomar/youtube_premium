module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/navigation/types.ts',
    '!src/data/types.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
  moduleNameMapper: {
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.ts',
    '^expo-video$': '<rootDir>/__mocks__/expo-video.js',
    '^expo-status-bar$': '<rootDir>/__mocks__/expo-status-bar.js',
    '^react-native-feather$': '<rootDir>/__mocks__/react-native-feather.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '\\.(css)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-feather)',
  ],
};
