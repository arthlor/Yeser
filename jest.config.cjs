// jest.config.js
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testMatch: [
    // Patterns Jest uses to detect test files
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  moduleFileExtensions: [
    // An array of file extensions your modules use
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  // Optional: If you have a setup file (e.g., for global mocks or polyfills)
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],

  // Important for React Native projects to transform (or not ignore) certain node_modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rneui/.*|@react-native-firebase/.*|pako|react-native-url-polyfill|toggle-switch-react-native|react-native-paper|@tanstack/react-query|zustand|msw))'
  ],

  // Optional: If you need to mock assets like images or fonts
  moduleNameMapper: {
    // Handle path aliases
    '^@/(.*)$': '<rootDir>/src/$1',

    // Mock assets like images or fonts if needed (example)
    // '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    // '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },

  // Collect coverage from src directory, excluding types and specific files if needed
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts', // Exclude TypeScript definition files
    '!src/types/**/*', // Exclude all files in src/types
    '!src/navigation/**/*', // Example: Exclude navigation files if they are mostly boilerplate
    '!src/utils/supabaseClient.ts', // Example: Exclude supabase client setup
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/constants/**',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Coverage report formats
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Specific thresholds for critical areas
    './src/hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/store/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
