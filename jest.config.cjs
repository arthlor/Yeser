// jest.config.js
module.exports = {
  preset: 'jest-expo',
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
  setupFilesAfterEnv: ['./jest-setup.ts'],

  // Important for React Native projects to transform (or not ignore) certain node_modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@rneui/.*|@react-native-firebase/.*|pako|react-native-url-polyfill|toggle-switch-react-native|react-native-paper))'
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
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'], // Coverage report formats
};
