# Image de production du back (NestJS). Contexte : la racine du dépôt (espace de travail pnpm).
#   docker build -f apps/backend/Dockerfile .
FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
# Dépendances d'abord : cette couche reste en cache tant que le lockfile ne change pas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
# backend... : le back et ses dépendances du dépôt (le core, dont les types sont vérifiés au build)
RUN pnpm install --offline --frozen-lockfile --filter backend... \
  && pnpm --filter backend build \
  && pnpm --filter backend deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
# deploy : package.json et dépendances de production ; dist est ignoré par git, donc copié à part
COPY --from=build --chown=node:node /out ./
COPY --from=build --chown=node:node /repo/apps/backend/dist ./dist
USER node
EXPOSE 8080
# Migrations à chaque démarrage (sans effet si la base est à jour), puis l'API
CMD ["sh", "-c", "node node_modules/typeorm/cli.js migration:run --dataSource dist/database/data-source.js && exec node dist/main.js"]
