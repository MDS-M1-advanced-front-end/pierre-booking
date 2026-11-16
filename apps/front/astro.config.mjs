// @ts-check
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { AstroPWAIntegration } from '@vite-pwa/astro';
import { defineConfig, memoryCache } from 'astro/config';

// Le client HTTP de core lit process.env.API_BASE_URL. Astro ne place pas le .env dans
// process.env : on le charge ici, sans écraser une variable déjà définie dans le shell.
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : on garde la valeur par défaut ci-dessous.
}
// Par défaut : le back NestJS (`pnpm dev` à la racine). Pour le mock Prism : http://localhost:4010.
process.env.API_BASE_URL ??= 'http://localhost:8080/api';
// URL vue par le navigateur. Elle diffère de celle du serveur en Docker : le serveur Astro appelle
// http://backend:8080/api, le navigateur http://localhost:8080/api.
process.env.PUBLIC_API_BASE_URL ??= process.env.API_BASE_URL;

// https://astro.build/config
export default defineConfig({
  // Pages statiques par défaut ; une page passe en SSR avec `export const prerender = false`.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    svelte(),
    // PWA : installable (manifeste) et consultable hors ligne (service worker src/sw.ts). Le service
    // worker n'existe qu'au build : tester avec `pnpm build` puis `pnpm preview`.
    AstroPWAIntegration({
      // buildSW : service worker écrit en TypeScript, compilé avec ses imports Workbox, et dans
      // lequel la liste des fichiers à précacher est injectée
      strategies: 'buildSW',
      // Adaptateur Node : les fichiers servis au navigateur sont dans dist/client. L'intégration
      // (v2.0.2) ne le prend en compte qu'avec `output: 'server'` et part de dist/ dans notre cas
      // (`output: 'static'` + adaptateur) : on écrit le service worker dans client/, on ne relève
      // que les fichiers de client/ (jamais ceux du serveur) et on retire ce préfixe des adresses.
      filename: 'client/sw.js',
      buildSW: {
        swSrc: 'src/sw.ts',
        // Le manifeste et ses icônes sont ajoutés par l'intégration : pas de doublon ici
        globPatterns: ['client/**/*.{js,css,html,svg,ico,woff2}', 'client/apple-touch-icon-*.png'],
        manifestTransforms: [
          (entries) => ({
            manifest: entries.map((entry) => ({
              ...entry,
              url: entry.url.replace(/^client\//, ''),
            })),
            warnings: [],
          }),
        ],
      },
      // Enregistrement par la page (AppStatus.svelte), avec le bandeau de mise à jour
      injectRegister: false,
      registerType: 'prompt',
      manifest: {
        name: 'Quorum : réservation de salles',
        short_name: 'Quorum',
        description: 'Réservez une salle de réunion en quelques clics.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        // --color-action et --color-bg des tokens (le manifeste ne lit pas le CSS)
        theme_color: '#0f5e5a',
        background_color: '#f8f7f5',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
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
    // Le client de core lit process.env.API_BASE_URL, qui n'existe pas dans le navigateur : la valeur
    // est inscrite au build, pour le code du navigateur seulement (voir cadrage.md § 2.4). Le serveur
    // (SSR) lit la vraie variable d'environnement au démarrage.
    environments: {
      client: {
        define: {
          'process.env.API_BASE_URL': JSON.stringify(process.env.PUBLIC_API_BASE_URL),
        },
      },
    },
  },
});
