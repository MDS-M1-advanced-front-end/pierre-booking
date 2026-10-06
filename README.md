# Réservation de salles

Application de réservation de salles, dans le framework de votre choix. Le code métier vient du dépôt `core` partagé.

## Structure

- `apps/<framework>/` : votre application (créée en séance 1 avec le générateur du méta-framework)
- `packages/core/` : copie du dépôt `core`, gérée par `pnpm core:sync` (ne pas modifier ici)
- `mock/` : mock de l'API servi par Prism, avec un jeu de données (`mock/data/`)
- `docs/ai-journal.md` : journal d'usage de l'IA, à tenir tout au long du module (livrable évalué)

## Démarrer

Deux possibilités, au choix. Gardez la même pour tout le module : les dépendances installées par Docker ne fonctionnent pas avec le Node de votre machine, et inversement. Pour changer de mode, supprimez d'abord tous les dossiers `node_modules/`.

### Option A : avec Docker (rien d'autre à installer)

Prérequis : Docker Desktop (Windows, macOS) ou Docker Engine avec le plugin Compose (Linux).

```sh
docker compose run --rm node pnpm core:sync   # copie le dépôt core dans packages/core
docker compose up mock                         # API mock sur http://localhost:4010
docker compose up dev                          # mock + serveur de dev de l'application
```

Toute autre commande `pnpm` se lance de la même façon : `docker compose run --rm node pnpm <commande>`. Les dépendances sont installées automatiquement à chaque lancement, dans le dossier du projet : votre éditeur voit donc les types.

Pour `docker compose up dev`, votre application (`apps/<framework>/`) doit avoir un script `dev` qui écoute sur `0.0.0.0` et sur l'un des ports publiés :

| Méta-framework | Script `dev`                                 | URL                   |
| -------------- | -------------------------------------------- | --------------------- |
| Next.js        | `next dev -H 0.0.0.0`                        | http://localhost:3000 |
| Nuxt           | `nuxt dev --host 0.0.0.0`                    | http://localhost:3000 |
| Angular        | `ng serve --host 0.0.0.0`                    | http://localhost:4200 |
| Vite           | `vite dev --host 0.0.0.0` (ou `vite --host`) | http://localhost:5173 |

Le serveur de dev partage le réseau du mock : `http://localhost:4010` fonctionne aussi depuis le code exécuté côté serveur (SSR).

### Option B : avec Node installé

Prérequis : Node 24 ou plus.

```sh
corepack enable
pnpm core:sync     # copie le dépôt core dans packages/core
pnpm install
pnpm mock          # API mock sur http://localhost:4010
pnpm dev           # serveur de dev de l'application (dans un autre terminal)
```

## Commandes

Avec Docker, préfixez chaque commande par `docker compose run --rm node`.

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
