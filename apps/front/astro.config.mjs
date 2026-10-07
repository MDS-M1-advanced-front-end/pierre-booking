// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// Le client HTTP de core lit process.env.API_BASE_URL. Astro ne place pas le .env dans
// process.env : on le charge ici, sans écraser une variable déjà définie dans le shell.
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : on garde la valeur par défaut ci-dessous.
}
// Par défaut : le mock Prism (`pnpm mock` ou `docker compose up mock`), servi sans préfixe /api.
process.env.API_BASE_URL ??= 'http://localhost:4010';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
