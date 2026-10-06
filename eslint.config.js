// Lint des scripts du dépôt. Chaque paquet de packages/ et apps/ a sa propre config ESLint.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules', 'packages/**', 'apps/**', 'mock/.generated'] },
  js.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: { 'no-unused-vars': ['error', { ignoreRestSiblings: true }] },
  },
];
