# Image de production du front (Astro, adaptateur Node). Contexte : la racine du dépôt.
#   docker build -f apps/front/Dockerfile --build-arg PUBLIC_API_BASE_URL=… .
FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
# URL de l'API vue par le navigateur : inscrite au build dans le code client
ARG PUBLIC_API_BASE_URL=http://localhost:8080/api
RUN pnpm install --offline --frozen-lockfile --filter "@room-booking/front..." \
  && PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL pnpm --filter @room-booking/front build \
  && pnpm --filter @room-booking/front deploy --prod --legacy /out

FROM node:24-alpine
# API_BASE_URL : URL de l'API pour le rendu serveur, lue au démarrage (voir compose.yaml)
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
WORKDIR /app
COPY --from=build --chown=node:node /out ./
COPY --from=build --chown=node:node /repo/apps/front/dist ./dist
USER node
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
