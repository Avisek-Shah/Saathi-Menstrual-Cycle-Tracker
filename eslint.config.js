const tsParser = require('@typescript-eslint/parser');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintConfigPrettier = require('eslint-config-prettier');
const eslintPluginReactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: ['node_modules/', '.expo/', 'dist/'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      'react-hooks': eslintPluginReactHooks,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      'prettier/prettier': 'warn',
    },
  },
];
