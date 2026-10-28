# Réservation de salles

Application de réservation de salles, dans le framework de votre choix. Le code métier vient du dépôt `core` partagé.

## Structure

- `apps/front/` : le front (Astro + Svelte)
- `apps/backend/` : l'API (NestJS, TypeORM, PostgreSQL)
- `packages/core/` : copie du dépôt `core`, gérée par `pnpm core:sync` (contrat `openapi.yml` et client HTTP)
- `mock/` : mock de l'API servi par Prism, avec un jeu de données (`mock/data/`), utilisé par les tests de bout en bout
- `docs/` : cadrage, architecture, base de données, journal d'usage de l'IA (`ai-journal.md`, livrable évalué)

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
cp .env.example .env   # au minimum JWT_SECRET
docker compose up -d --build
```

Front sur http://localhost:4321, API sur http://localhost:8080/api. Les migrations s'appliquent au démarrage du back. La base n'est pas exposée ; elle démarre vide (le seed est réservé au développement).

## Commandes

```sh
pnpm check         # tout ce que vérifie la CI : typecheck, lint, format:check, test
pnpm typecheck     # tsc dans chaque paquet
pnpm lint
pnpm test
pnpm format
```

## Le mock Prism

Prism répond à partir du contrat et du jeu de données, **sans état** : une réservation créée n'apparaît pas dans la liste suivante.

- Les routes protégées renvoient `401` sans en-tête `Authorization: Bearer <jeton>`. N'importe quel jeton est accepté.
- Les requêtes invalides au regard du contrat renvoient `400`.
- Pour choisir un exemple précis, envoyez l'en-tête `Prefer: example=<nom>` :
  - `/auth/login`, `/auth/me` : `client-1` à `client-3`, `gestionnaire-1` à `gestionnaire-3`, `admin-1` à `admin-3` (par défaut `client-1`) ;
  - `/rooms/{roomId}` : `room-01` à `room-15`.
