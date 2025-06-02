import eslintJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
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

export default tseslint.config(
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

  // General project-specific rules (apply to JS/TS unless overridden)
  {
    rules: {
      'curly': ['error', 'all'],
      'object-shorthand': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-nested-ternary': 'error',
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'prefer-destructuring': [
        'error',
        { object: true, array: true }, 
        { enforceForRenamedProperties: false },
      ],
      'no-shadow': 'error', // Base rule for JS, @typescript-eslint/no-shadow will handle TS
    },
  },

  // TypeScript specific configurations
  ...tseslint.configs.strictTypeChecked, // More comprehensive than 'recommended'
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx}'], // Apply only to TypeScript files
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parserOptions: {
        project: true, // Auto-detect tsconfig.json
        tsconfigRootDir: import.meta.dirname, // Assumes eslint.config.js is at project root
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'warn', // Or 'error' if preferred
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: "Don't declare enums. Use string literal unions or 'as const' objects instead.",
        },
      ],
      // Consider if these from strict/stylistic are too much or need adjustment
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Downgrade from error if too noisy initially
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
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
      ...reactPlugin.configs['jsx-runtime'].rules, // For new JSX transform
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', 
      'react/prop-types': 'off', 
      'react/no-unescaped-entities': 'off', 
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/self-closing-comp': 'error',
    },
  },
  
  // General globals for the project
  {
    languageOptions: {
      globals: {
        ...cleanGlobals(globals.node),
        ...cleanGlobals(globals.es2021),
        // ...cleanGlobals(globals.jest), // Jest globals might be better in a test-specific config block
      },
    },
  },
  // Jest/Testing specific configuration (Example - if you have test files)
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...cleanGlobals(globals.jest),
      },
    },
    rules: {
      // Add any test-specific rule overrides here
      // e.g., '@typescript-eslint/no-unsafe-assignment': 'off', for test mocks
    }
  },

  // Import plugin configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react*(-native)?',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@src/**', // Example: if you use @src/* for internal paths
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-default-export': 'warn', // Standard: "Default to named exports..."
    },
  },

  // Disable Prettier for config files as Prettier CLI handles them
  {
    files: ['*.config.js', '*.config.cjs', '.prettierrc.cjs'], // Added .prettierrc.cjs
    rules: {
      'prettier/prettier': 'off',
    },
  },

  // Prettier configuration (must be last to override other formatting rules)
  eslintConfigPrettier, 
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', 
    },
  }
);
