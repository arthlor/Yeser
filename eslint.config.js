import eslintJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Helper to trim keys from global objects
const cleanGlobals = globalSet => {
  const cleaned = {};
  for (const key in globalSet) {
    cleaned[key.trim()] = globalSet[key];
  }
  return cleaned;
};

export default [
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'web-build/',
      'android/',
      'ios/',
      '*.config.js',
      '*.config.cjs',
      '.prettierrc.cjs',
      '.DS_Store',
      '.env*',
      '*.orig.*',
      '*.jks',
      '*.p8',
      '*.p12',
      '*.key',
      '*.mobileprovision',
      '.metro-health-check*',
      'npm-debug.*',
      'yarn-debug.*',
      'yarn-error.*',
      'docs/',
    ],
  },
  // Base ESLint recommended rules
  eslintJs.configs.recommended,

  // TypeScript specific configurations
  ...tseslint.configs.recommended,
  // Overrides for TypeScript rules
  {
    files: ['**/*.{ts,tsx}'], // Apply only to TypeScript files
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // React specific configurations
  {
    files: ['**/*.{ts,tsx}'], // Apply React rules only to TS/TSX files
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...cleanGlobals(globals.browser),
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ new JSX transform
      'react/prop-types': 'off', // Using TypeScript for prop types
      'react/no-unescaped-entities': 'off',
    },
  },

  // TypeScript Project-specific parsing (for type-aware rules)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  // General globals for the project
  {
    languageOptions: {
      globals: {
        ...cleanGlobals(globals.node),
        ...cleanGlobals(globals.es2021),
        ...cleanGlobals(globals.jest),
      },
    },
  },

  // Import sorting configuration
  {
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // Disable Prettier for config files as Prettier CLI handles them
  {
    files: ['*.config.js', '*.config.cjs'],
    rules: {
      'prettier/prettier': 'off',
    },
  },

  // Prettier configuration (must be last)
  eslintConfigPrettier, // Disables ESLint rules that conflict with Prettier
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', // Runs Prettier as an ESLint rule
    },
  },
];
