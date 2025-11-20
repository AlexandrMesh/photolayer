const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const prettierPlugin = require('eslint-plugin-prettier');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('eslint-plugin-react-native');

module.exports = [
  // Базовая конфигурация для всех файлов
  js.configs.recommended,

  // Основные настройки
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: 'readonly',
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        // Node.js globals
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        // React Native globals
        alert: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // TypeScript/React globals
        JSX: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // TypeScript rules
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',

      // React rules
      ...reactPlugin.configs['recommended'].rules,
      'react/react-in-jsx-scope': 'off', // Не требуется в React Native
      'react/prop-types': ['error', { ignore: ['navigation'] }],
      'react/require-default-props': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx', '.jsx'] }],
      'react/function-component-definition': [
        'warn',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/jsx-props-no-spreading': 'off',
      'react/jsx-curly-newline': [
        'error',
        {
          multiline: 'consistent',
          singleline: 'consistent',
        },
      ],
      'react/jsx-wrap-multilines': [
        'error',
        {
          declaration: 'parens-new-line',
          assignment: 'parens-new-line',
          return: 'parens-new-line',
          arrow: 'parens-new-line',
          condition: 'parens-new-line',
          logical: 'parens-new-line',
          prop: 'parens-new-line',
        },
      ],

      // React Hooks rules
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',

      // React Native rules
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Встроенные модули Node.js (fs, path и т.д.)
            'external', // Внешние пакеты из node_modules
            'internal', // Внутренние модули проекта (с алиасами)
            ['parent', 'sibling'], // Родительские и соседние модули
            'index', // Индексные файлы
            'object',
            'type', // TypeScript type импорты
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: 'react-native',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: '~**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '~**/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // Отключаем, так как TypeScript сам проверяет разрешение импортов
      'import/named': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'import/no-cycle': 'off',
      'import/no-unused-modules': 'off',
      'import/no-deprecated': 'warn',
      'import/no-relative-packages': 'error',
      'import/extensions': [
        'error',
        'never',
        {
          json: 'always',
          png: 'always',
          jpg: 'always',
          svg: 'always',
        },
      ],

      // General rules
      'no-shadow': 'off',
      'global-require': 'off',
      'arrow-parens': ['error', 'always'],
      'object-curly-newline': ['error', { consistent: true }],
      'linebreak-style': 'off',
      'no-underscore-dangle': 'off',
      'consistent-return': 'off',
      'no-param-reassign': 'off',
      'max-len': [
        'error',
        {
          code: 150,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'warn',
        {
          functions: false,
          classes: true,
          variables: false,
          ignoreTypeReferences: true,
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Prettier integration (должен быть после других правил)
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 150,
          endOfLine: 'auto',
          htmlWhitespaceSensitivity: 'css',
          jsxSingleQuote: true,
          quoteProps: 'as-needed',
          semi: true,
          tabWidth: 2,
        },
      ],
    },
  },

  // Игнорируем сгенерированные файлы
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.expo-shared/**',
      'android/**',
      'ios/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.next/**',
      'out/**',
      '*.min.js',
      'scripts/**',
      '*.lock',
      '.env*',
    ],
  },

  // Применяем prettier config в самом конце, чтобы отключить конфликтующие правила,
  // НО import/order останется активным, так как мы его определили выше
  prettierConfig,
];
