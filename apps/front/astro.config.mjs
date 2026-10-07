// @ts-check
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

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
  // Pages statiques par défaut ; une page passe en SSR avec `export const prerender = false`.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    // Le client de core lit process.env.API_BASE_URL, qui n'existe pas dans le navigateur :
    // la valeur est inscrite au build (voir cadrage.md § 2.4).
    define: {
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
    },
  },
});
