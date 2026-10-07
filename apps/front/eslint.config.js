import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['node_modules', 'dist', '.astro', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.astro', '.svelte'],
      },
    },
    rules: {
      // Autorise `${nombre}` dans les template strings, comme dans core
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  astro.configs['flat/recommended'],
  {
    // Les règles typées ne savent pas lire les fichiers .astro et les fichiers de config JS
    files: ['**/*.astro', '**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
