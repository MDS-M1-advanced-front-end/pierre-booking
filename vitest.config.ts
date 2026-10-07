// Tests unitaires de tout le dépôt, organisés en projets nommés (cadrage.md § 2.8).
//   pnpm test                          tous les projets
//   pnpm test --project front:utils    un seul projet
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

const front = 'apps/front';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: 'packages/core',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'front:utils',
          root: front,
          include: ['src/utils/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        // Plugin Svelte : session.svelte.ts utilise les runes ($state)
        plugins: [svelte({ configFile: false, preprocess: vitePreprocess() })],
        test: {
          name: 'front:data',
          root: front,
          include: ['src/data/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
      {
        plugins: [svelte({ configFile: false, preprocess: vitePreprocess() }), svelteTesting()],
        test: {
          name: 'front:components',
          root: front,
          include: ['src/components/**/*.test.ts', 'src/partials/**/*.test.ts'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
    passWithNoTests: true,
  },
});
