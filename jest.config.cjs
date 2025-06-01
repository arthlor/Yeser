// jest.config.js
module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\.jsx?$': 'babel-jest', // Transform JS/JSX files with babel-jest
    '^.+\.tsx?$': [
      'ts-jest',
      {
        // Transform TS/TSX files with ts-jest
        tsconfig: 'tsconfig.json', // Or your specific tsconfig file
      },
    ],
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
  // setupFilesAfterEnv: ['./jest.setup.js'],

  // Important for React Native projects to transform (or not ignore) certain node_modules
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-url-polyfill)',
  ],

  // Optional: If you need to mock assets like images or fonts
  // moduleNameMapper: {
  //   '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  //   '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  // },

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
