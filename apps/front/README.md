# Front : Quorum

Astro 7 (pages statiques, quelques pages rendues par le serveur avec cache de route) et îlots Svelte 5, Tailwind 4. PWA installable et consultable hors ligne. Voir le [README racine](../../README.md) pour lancer tout le projet.

- Organisation des fichiers et règles (pages, partials, components, data) : [docs/architecture.md](../../docs/architecture.md).
- Écrans, session, rendu, PWA : [docs/cadrage.md](../../docs/cadrage.md).

## Configuration

Copier `.env.example` en `.env` pour changer l'adresse de l'API :

- `API_BASE_URL` : API appelée par le serveur Astro (par défaut le back, `http://localhost:8080/api` ; mock Prism : `http://localhost:4010`) ;
- `PUBLIC_API_BASE_URL` : API appelée par le navigateur, inscrite dans le code au build (par défaut `API_BASE_URL`).

## Commandes (dans `apps/front`)

```sh
pnpm dev                  # http://localhost:4321 (sans service worker)
pnpm build                # build de production, service worker compris
node dist/server/entry.mjs   # sert le build (tester la PWA)
pnpm typecheck            # astro check + svelte-check
pnpm lint
pnpm test:e2e             # Playwright contre le mock Prism (arrêter pnpm dev avant)
pnpm generate:pwa-assets  # icônes de la PWA depuis public/favicon.svg
```

Les tests unitaires se lancent depuis la racine (`pnpm test`).
