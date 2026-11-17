# Quorum : réservation de salles

Application de réservation de salles : catalogue public, espace client (réservations), espace gestionnaire (salles, disponibilités, demandes) et administration (tableau de bord, utilisateurs, toutes les réservations). API REST, plus une API GraphQL pour l'administration et l'écran Demandes (`POST /api/graphql`). Le front est une PWA installable, consultable hors ligne, où une demande de réservation faite hors ligne est envoyée au retour de la connexion (`docs/cadrage.md` § 2.10). Le contrat et le client viennent du dépôt `core` partagé.

## Structure

- `apps/front/` : le front (Astro + Svelte)
- `apps/backend/` : l'API (NestJS, TypeORM, PostgreSQL)
- `packages/core/` : copie du dépôt `core`, gérée par `pnpm core:sync` (contrats `openapi.yml` et `admin.graphql`, clients REST et GraphQL typés) ; une modification locale doit être reportée sur ce dépôt
- `mock/` : mock de l'API servi par Prism, avec un jeu de données (`mock/data/`), utilisé par les tests de bout en bout
- `docs/` : cadrage, plan, architecture, cas d'usage, base de données, pistes d'évolution, journal d'usage de l'IA (`ai-journal.md`, livrable évalué)

## Développement

Prérequis : Node 24 ou plus, et Docker (pour la base PostgreSQL).

```sh
corepack enable
pnpm install
cp apps/backend/.env.example apps/backend/.env   # facultatif : port de la base, secret JWT…
pnpm dev           # base (compose.dev.yaml), migrations, puis back et front en parallèle
pnpm seed          # une fois, dans un autre terminal : jeu de données du mock
```

- Front : http://localhost:4321 ; API : http://localhost:8080/api
- Comptes du seed : ceux du mock (`client1@salles.example`, `gestionnaire1@salles.example`, `admin1@salles.example`…), mot de passe `motdepasse`.
- Port 5432 déjà pris : mettre `DB_PORT=5433` dans `apps/backend/.env`. `pnpm dev` publie la base sur ce port et le back s'y connecte.
- Front sur le mock au lieu du back : `pnpm mock`, et `API_BASE_URL=http://localhost:4010` dans `apps/front/.env`.

## Production

Images construites depuis `apps/backend/Dockerfile` et `apps/front/Dockerfile`, orchestrées par `compose.yaml` :

```sh
cp .env.example .env   # à remplir : JWT_SECRET, JWT_REFRESH_SECRET, PEPPER_SECRET, DB_PASSWORD
docker compose up -d --build
```

Front sur http://localhost:4321, API sur http://localhost:8080/api. Derrière un proxy (Dokploy…), fixer aussi `PUBLIC_API_BASE_URL` (adresse de l'API vue par le navigateur, inscrite au build du front) et `FRONT_URL` (origine autorisée par le CORS). Les migrations s'appliquent au démarrage du back. La base n'est pas exposée ; elle démarre vide. Pour charger le jeu de démo une fois, sur une base neuve (le seed vide toutes les tables), dans le conteneur du back : `SEED_PASSWORD=… node dist/database/seed.js --production`.

## Commandes

```sh
pnpm check         # tout ce que vérifie la CI : typecheck, lint, format:check, test
pnpm typecheck     # core : tsc ; front : astro check + svelte-check (le back est vérifié par nest build)
pnpm lint
pnpm test          # Vitest : back, core, front (projets dans vitest.config.ts)
pnpm format
pnpm --filter @room-booking/front test:e2e   # Playwright contre le mock Prism (arrêter pnpm dev avant)
```

PWA : le service worker n'existe qu'au build. Pour le tester : `pnpm --filter @room-booking/front build`, puis `node dist/server/entry.mjs` dans `apps/front`.

## Le mock Prism

Prism répond à partir du contrat et du jeu de données, **sans état** : une réservation créée n'apparaît pas dans la liste suivante.

- Les routes protégées renvoient `401` sans en-tête `Authorization: Bearer <jeton>`. N'importe quel jeton est accepté.
- Les requêtes invalides au regard du contrat renvoient `400`.
- Pour choisir un exemple précis, envoyez l'en-tête `Prefer: example=<nom>` :
  - `/auth/login`, `/auth/me` : `client-1` à `client-3`, `gestionnaire-1` à `gestionnaire-3`, `admin-1` à `admin-3` (par défaut `client-1`) ;
  - `/rooms/{roomId}` : `room-01` à `room-15`.
