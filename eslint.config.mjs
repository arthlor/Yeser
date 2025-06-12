// eslint.config.js
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactNativePlugin from 'eslint-plugin-react-native';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';


export default [
  js.configs.recommended,
  // Global ignores for all configs
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.expo/**',
      'coverage/**',
      'android/**',
      'ios/**',
      'web-build/**',
      '.next/**',
      'out/**',
      '**/generated/**',
      '**/*.generated.*',
      '**/bundle/**',
      '**/bundles/**',
      '**/assets/bundle.*',
      '**/assets/bundle.js',
      '**/*.bundle.js',
      '**/*.bundle.map',
      '**/*.chunk.js',
      '**/chunks/**',
      'scripts/**/*.js',
      'scripts/**/*.cjs',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      '*.config.ts',
      'metro.config.*',
      'babel.config.*',
      'jest.config.*',
      'jest-setup.*',
      'webpack.config.*',
      'rollup.config.*',
      'vite.config.*',
    ],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'index.ts', 'App.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: 'readonly',
        global: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        URL: 'readonly',
        // React Native specific
        performance: 'readonly',
        // Jest globals for test files
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,

    },
    rules: {
      // TypeScript rules - PERFORMANCE CRITICAL
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // Bundle optimization (72% impact)
      '@typescript-eslint/no-explicit-any': 'error', // Type safety (MANDATORY - ZERO any types allowed)
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React rules - PERFORMANCE CRITICAL
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error', // Hook dependency safety (CRITICAL - prevents infinite loops)

      // React Native rules - PERFORMANCE CRITICAL
      'react-native/no-unused-styles': 'off', // Disabled due to false positives with memoized styles (GitHub issues #276, #320, #321)
      'react-native/split-platform-components': 'off',
      'react-native/no-inline-styles': 'error', // Performance optimization (15% impact - NO EXCEPTIONS)
      'react-native/no-color-literals': 'warn', // Theme consistency
      'react-native/no-raw-text': 'off',

      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Import organization
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Configuration for Node.js scripts
  {
    files: ['scripts/**/*.{js,cjs}'],
    languageOptions: {
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console in scripts
      '@typescript-eslint/no-unused-vars': 'off', // Scripts may have different patterns
      '@typescript-eslint/no-explicit-any': 'off', // Scripts may need more flexibility
    },
  },
];
