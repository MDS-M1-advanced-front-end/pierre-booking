// @ts-check
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, memoryCache } from 'astro/config';

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
  // Cache de route, équivalent ISR (cadrage.md § 2.1) : pages SSR publiques gardées en mémoire par
  // le serveur Node (clé = chemin + paramètres d'URL triés). `maxAge` : réponse servie telle quelle
  // (en-tête X-Astro-Cache: HIT) ; puis pendant `swr` : servie périmée (STALE) et régénérée en
  // arrière-plan. Inactif en `astro dev` (Astro.cache n'y fait rien).
  cache: { provider: memoryCache() },
  routeRules: {
    '/': { maxAge: 60, swr: 300 },
    '/salles/[id]': { maxAge: 300, swr: 3600 },
  },
  vite: {
    plugins: [tailwindcss()],
    // Le client de core lit process.env.API_BASE_URL, qui n'existe pas dans le navigateur :
    // la valeur est inscrite au build (voir cadrage.md § 2.4).
    define: {
      'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
    },
  },
});
