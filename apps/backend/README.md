# Back : API de Quorum

NestJS 11, TypeORM, PostgreSQL. Voir le [README racine](../../README.md) pour lancer tout le projet (`pnpm dev`) et pour la production (Docker).

## Organisation

Clean architecture, un module par domaine dans `src/modules/` : `users` (comptes, authentification), `rooms` (salles, disponibilités), `reservations` (réservations, paiements simulés, administration). Chaque module est découpé en :

- `domain/` : entités et règles métier, exceptions, interfaces des repositories ;
- `application/` : cas d'usage et ports (interfaces vers l'extérieur) ;
- `infrastructure/` : controllers REST, resolvers GraphQL, DTO, filtre d'exceptions, persistance TypeORM, adaptateurs.

`src/common/` regroupe le transversal (fuseau de Paris, secrets, erreurs de l'API). Base de données : [docs/Database.md](../../docs/Database.md).

## API

- REST sous `/api`, selon le contrat `packages/core/openapi.yml`.
- GraphQL sur `POST /api/graphql` (administration et écran Demandes), schéma `packages/core/admin.graphql` (lien `src/graphql/admin.graphql`).
- Limitation de débit : 100 requêtes par minute, 5 sur les routes d'authentification.

## Configuration

Copier `.env.example` en `.env`. En production, `JWT_SECRET`, `JWT_REFRESH_SECRET` et `PEPPER_SECRET` sont obligatoires, longs d'au moins 16 caractères et distincts des valeurs de développement : le back refuse de démarrer sinon (`src/common/secrets.ts`).

## Commandes (dans `apps/backend`)

```sh
pnpm dev                  # API en mode watch sur http://localhost:8080/api
pnpm migration:run        # applique les migrations (lancé par pnpm dev à la racine)
pnpm migration:generate src/database/migrations/<Nom>   # après une modification d'entité
pnpm seed                 # jeu de démo du mock (vide d'abord toutes les tables)
pnpm test                 # Vitest, fichiers src/**/*.spec.ts
pnpm lint                 # oxlint
pnpm build                # compilation (SWC), vérifie aussi les types
```

En production, l'image lance les migrations au démarrage. Le seed y est refusé sauf avec `--production` : `SEED_PASSWORD=… node dist/database/seed.js --production`, une seule fois, sur une base neuve.
