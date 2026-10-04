import globals from 'globals';
import pluginN from 'eslint-plugin-n';
import pluginImport from 'eslint-plugin-import-x';
import pluginPromise from 'eslint-plugin-promise';
import pluginSecurity from 'eslint-plugin-security';
import pluginJsdoc from 'eslint-plugin-jsdoc';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Global ignores ──
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'playwright-report/**',
      'test-results/**',
      'infra/k6/**',
    ],
  },

  // ── Base config for all JS/JSX ──
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.es2024,
      },
    },
    plugins: {
      'import-x': pluginImport,
      promise: pluginPromise,
      security: pluginSecurity,
      jsdoc: pluginJsdoc,
    },
    rules: {
      // ── Import ordering and hygiene ──
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-cycle': ['error', { maxDepth: 3 }],
      'import-x/extensions': ['error', 'always', { ignorePackages: true }],

      // ── Promise discipline ──
      'promise/always-return': 'warn',
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'warn',

      // ── Security ──
      'security/detect-object-injection': 'off', // too noisy for bracket notation
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // ── JSDoc (required on exports) ──
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: { FunctionDeclaration: true, MethodDefinition: true },
          publicOnly: true,
        },
      ],
      'jsdoc/require-param': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/check-types': 'warn',

      // ── General quality ──
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
    },
  },

  // ── Node.js-specific (backend, ml, shared, infra scripts) ──
  {
    files: [
      'backend/**/*.js',
      'ml/**/*.js',
      'shared/**/*.js',
      'infra/**/*.js',
    ],
    plugins: {
      n: pluginN,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'n/no-missing-import': 'off', // handled by moduleResolution
      'n/no-unsupported-features/es-syntax': 'off', // ES modules
      'n/no-process-exit': 'warn',
      'n/prefer-promises/fs': 'warn',
    },
  },

  // ── Frontend (browser globals, JSX) ──
  {
    files: ['frontend/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'n/no-process-exit': 'off',
    },
  },

  // ── Dependency direction enforcement (Part 4.1) ──
  // frontend may NOT import backend or ml
  {
    files: ['frontend/**/*.{js,jsx}'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './frontend', from: './backend', message: 'frontend MUST NOT import backend' },
            { target: './frontend', from: './ml', message: 'frontend MUST NOT import ml' },
          ],
        },
      ],
    },
  },
  // backend may NOT import frontend
  {
    files: ['backend/**/*.js'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './backend', from: './frontend', message: 'backend MUST NOT import frontend' },
          ],
        },
      ],
    },
  },
  // ml may NOT import backend or frontend
  {
    files: ['ml/**/*.js'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './ml', from: './backend', message: 'ml MUST NOT import backend' },
            { target: './ml', from: './frontend', message: 'ml MUST NOT import frontend' },
          ],
        },
      ],
    },
  },
  // shared may NOT import any other package
  {
    files: ['shared/**/*.js'],
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './shared', from: './backend', message: 'shared MUST NOT import backend' },
            { target: './shared', from: './frontend', message: 'shared MUST NOT import frontend' },
            { target: './shared', from: './ml', message: 'shared MUST NOT import ml' },
          ],
        },
      ],
    },
  },

  // ── Test files (relaxed rules) ──
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
    rules: {
      'no-console': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },
];
