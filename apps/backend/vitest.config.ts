import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    name: 'backend',
    globals: true,
    // Dossier de ce fichier : la configuration est aussi chargée depuis la racine du dépôt
    root: import.meta.dirname,
    include: ['src/**/*.spec.ts'],
  },
});
