# Journal d'usage de l'IA

L'IA est autorisée pendant le projet, à condition d'être **tracée ici**. Ce journal est un livrable évalué (4 points : régularité, erreurs de l'IA relevées et corrigées, posture critique) et sert de base aux questions de la soutenance sur le code généré.

**Règles**

- Une entrée par usage significatif : génération de code, débogage, explication d'un concept, revue, traduction d'un composant… Pas besoin de tracer chaque complétion automatique d'une ligne.
- Rédigez l'entrée **au moment** où vous utilisez l'IA, pas en fin de module.
- Soyez honnête sur ce qui a été accepté tel quel : c'est la vérification et la critique qui sont évaluées, pas le fait de ne pas utiliser l'IA.
- Ajoutez les nouvelles entrées **en haut** de la section _Entrées_.

Apprenant : Pierre Gaillard
Framework / méta-framework : Astro (sans framework de composants)

---

## Entrées

### AAAA-MM-JJ — Titre court (séance N)

- **Outil** : …
- **Objectif** : …
- **Demande** (résumé du prompt, contexte fourni) : …
- **Résultat** : accepté tel quel / modifié / rejeté
- **Erreurs de l'IA relevées** : … (ou « aucune trouvée »)
- **Vérification** : … (`pnpm typecheck`, tests, test manuel, documentation consultée…)
- **Ce que j'en retiens** : …

### 2026-10-07 — Implémentation, lot 0 : fondations (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : dérouler le lot 0 du plan (outillage, configuration, mise en conformité avec l'architecture) sur la branche `feat/front`.
- **Demande** : « Tu peux reprendre, tu as le droit de lancer jusqu'à 7 sous-agents simultanés. » Mes décisions juste avant : branche dédiée + push + PR, tout le plan d'une traite, Playwright sur Chromium seul, une entrée de journal par lot.
- **Résultat** : _à compléter_
- **Ce qui a été fait** (11 commits, de `bd6ed0e` à `676bf62`) : `pnpm check` réparé (plugins Prettier Astro et Svelte, fichiers générés ignorés) ; ESLint pour le front (`.ts`, `.astro`, `.svelte`) ; mise en conformité avec `architecture.md` (theme, Head, Layout, data, partials, utils) ; `API_BASE_URL` ; Svelte, adaptateur Node, `vite.define` ; Vitest centralisé en projets nommés (`core`, `front:utils`, `front:data`, `front:components`) ; Playwright ; composant `Icon` en Svelte (21 icônes de la maquette).
- **Erreurs de l'IA relevées** :
  - **avoir commencé à coder sans mon feu vert** : j'avais répondu « ok. d'autres questions ? » et l'IA l'a pris pour un départ ; j'ai dû l'arrêter et remettre à zéro les fichiers non committés. Consigne enregistrée dans sa mémoire : attendre un « go » explicite ;
  - Prettier lancé depuis `apps/front` a **reformaté `tokens.css`**, qui doit rester une copie exacte de la maquette : le `.prettierignore` de la racine n'est pas lu quand on lance Prettier depuis un sous-dossier. Repéré dans le `--stat` du commit, fichier recopié depuis `maquettes/` (vérifié avec `cmp`) et commit corrigé ;
  - **décision 5 (dev sur 5173) intenable**, découverte en lançant Playwright : le conteneur Docker du mock occupe déjà le port 5173 de la machine, et Astro 7 refuse un second serveur de dev dans le même projet. Corrigé : dev sur 4321 avec `--host 0.0.0.0`, `4321` publié dans `compose.yaml`, docs mises à jour ;
  - `tseslint.config()` est déprécié (signalé par `astro check`) : remplacé par `defineConfig` d'ESLint ;
  - premier composant Svelte de test : `svelte-check` a refusé `result.data.total`, qui est optionnel dans `PaginatedRooms` (bonne détection, corrigé).
- **Vérification** :
  - îlot Svelte testé dans **Chromium sur le serveur buildé** : 15 salles reçues du mock depuis le navigateur, clic OK, rendu statique correct ;
  - le lint détecte bien une erreur volontaire dans un `.astro` puis dans un `.svelte` ;
  - Vitest : un test de composant Svelte avec un vrai clic passe ; `--project front:utils` et `--project 'front:*'` fonctionnent ;
  - Playwright : premier test de bout en bout OK ; `pnpm check` OK.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Retour en arrière sur la mise en conformité et décisions de cadrage (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : retirer le code de mise en conformité (il sera refait pendant l'implémentation) en gardant les documents, et intégrer mes décisions sur les 9 points du plan.
- **Demande** : « Fais un reset soft : la partie Head commun et le reste, tu le feras en implémentation. Garde juste le changement d'architecture dans le fichier. » Puis mes réponses aux 9 points : cache OK ; `mockPersona` OK ; **pas de Zod dans le front, on utilise `core` tel quel** ; tests unitaires (Vitest centralisé) + de bout en bout ; `dev` sur 5173 OK ; liste des lieux évolutive ; connexion automatique après inscription ; changement de mot de passe ; créneaux de la réservation modifiée sélectionnables.
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - sauvegarde de l'ancien état sur la branche `backup/ecarts-implementes`, `git reset --soft` jusqu'à `dc680ff`, code du front remis à cet état ; `architecture.md`, `cadrage.md`, `plan.md` et le journal restent dans le répertoire de travail, non committés ;
  - les commits `e79288b`, `a0b8f95`, `29bc978` et `6a3cd50`, cités dans les entrées ci-dessous, n'existent plus que sur la branche de sauvegarde ;
  - décisions reportées dans `cadrage.md` (plus aucun « à valider ») et `plan.md` (réécrit : mise en conformité et `API_BASE_URL` déplacées aux étapes 0.3 et 0.4, Vitest à la racine avec `test.projects` en 0.9, Playwright en 0.10, un parcours de bout en bout par lot, messages de validation à partir du `ValidityState` du navigateur au lieu de Zod) ; `architecture.md` : plus de `schemas.ts`, emplacement des tests ;
  - « l'autre » outil de test : **Playwright**, qui pilote un vrai navigateur pour rejouer les parcours.
- **Erreurs de l'IA relevées** :
  - **commit mélangé** : le commit « docs : ajoute le document d'architecture » (`e79288b`) contenait aussi le renommage `src/styles` → `src/theme`, déjà indexé par un `git mv` au moment du `git add docs/…`. Résultat : ce commit **cassait le build** (`index.astro` importait encore `../styles/global.css`). Repéré seulement maintenant, au `pnpm build` qui a suivi le reset. Le reset est donc allé un commit plus loin que prévu (`dc680ff` au lieu de `e79288b`). Leçon : relire `git diff --cached --stat` avant chaque commit ;
  - `astro check` (0 erreur) **ne détecte pas** un import CSS introuvable. Seul `pnpm build` le voit. Le plan impose désormais les deux à chaque étape.
- **Point qui restait à confirmer** : `estimatePrice` était encore prévue dans le front (`core` n'a pas cette fonction). Ma réponse : **on supprime l'estimation de prix**. Le récapitulatif montre la durée et le tarif horaire ; le `totalAmount` du serveur s'affiche après création. Documents mis à jour.
- **Précision sur Vitest** : organisation en **projets nommés** (`test.projects`, option confirmée dans les types de `vitest@5.0.2`) : `core`, `front:utils`, `front:data`, `front:components`, chacun avec ses fichiers et son environnement (`node` ou `jsdom`). On peut en lancer un seul avec `--project`.
- **Vérification** : `pnpm build` et `pnpm typecheck` OK sur `dc680ff` ; plus aucun « [à valider] » dans `cadrage.md` ; `grep` des mentions de Zod dans les trois documents.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Cadrage complet : `cadrage.md` et `plan.md` (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : cadrer tout le site (11 écrans) sans coder : décisions techniques, routes, écrans, composants, anomalies, risques et plan d'action ordonné, pour que l'IA déroule ensuite tout le site d'un coup.
- **Demande** : « On fait le cadrage complet sans que tu codes : juste doc, plan d'action et autres. » Mes réponses aux questions de l'IA : Socle + Standard ; ISR si possible ; jeton dans le `localStorage` avec appels depuis le navigateur ; fichiers dans `docs/`.
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - lecture des 11 écrans, de `composants.html` et des notes de maquette ; lecture du contrat et du client de `core` ;
  - `docs/cadrage.md` : rendu par type de page (SSR + cache de route pour les pages publiques, statique pour l'authentification, coquille + îlot Svelte pour l'espace connecté), session dans le `localStorage`, accès API, profils de test du mock, validation, fuseaux et prix, qualité, routes, fiche par écran, composants, accessibilité, 13 anomalies, risques ;
  - `docs/plan.md` : 7 lots (fondations → interface → données/session → écrans publics → client → gestionnaire → finitions), chacun avec une définition de fini, plus la liste des 9 décisions à trancher ;
  - `architecture.md` aligné : composants en Svelte, `schemas.ts` autorisés temporairement, `session.svelte.ts`.
- **Vérifications faites par l'IA avant d'affirmer** :
  - **ISR** : Astro n'a pas d'ISR au sens de Next.js, mais Astro 7 a un cache de route (`cache.provider`, `routeRules` avec `maxAge` / `swr`), trouvé dans les types de `astro@7.3.6`. Pas encore testé en conditions réelles, d'où l'étape 3.1 du plan ;
  - **mock** : CORS accepté depuis `localhost:4321` (requête `OPTIONS`) ; `POST /auth/login` renvoie **toujours** le client Léa Martin, quel que soit l'e-mail, et le gestionnaire seulement avec `Prefer: example=gestionnaire-1`. Sans cette vérification, l'espace gestionnaire aurait été impossible à tester ;
  - **`core`** : pas de schémas Zod ni de fonction de prix, malgré son README et la maquette ; `changePassword` existe, alors que la maquette affirme le contraire (anomalie 10 en partie fausse) ; pas de route de rafraîchissement du jeton ;
  - **`pnpm check` échoue aujourd'hui** (Prettier sur `.astro/`, `dist/`, fichiers non formatés) : je ne l'avais pas lancé avant de dire « committé et vérifié » aux étapes précédentes ; seul `pnpm typecheck` l'était ;
  - versions et dépendances `peer` de `@astrojs/svelte`, `@astrojs/node`, des plugins Prettier et de Vitest, compatibles avec Astro 7 et TypeScript 6.
- **Erreurs de l'IA relevées** :
  - aux étapes précédentes, « vérifié » ne voulait dire que `pnpm typecheck`. Le contrôle complet du dépôt (`pnpm check`) n'avait jamais été lancé et il échoue. Corrigé dans le plan (étape 0.1, et `pnpm check` à chaque fin de lot) ;
  - en écrivant le cadrage, l'IA a contredit `architecture.md` (Svelte, `schemas.ts`), document qu'elle venait elle-même d'écrire. Elle l'a vu à la relecture et a mis l'architecture à jour.
- **Points à trancher** : voir la fin de `docs/plan.md` (9 décisions).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Mise en conformité avec `architecture.md` et variable `API_BASE_URL` (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : corriger les écarts listés dans `architecture.md` et trancher les points ouverts.
- **Demande** : « Applique les écarts et committe. » Mes décisions : CSR plus tard avec Svelte (`@astrojs/svelte`) ; ajouter la variable d'environnement avec une URL par défaut ; trouver l'URL du mock dans le `compose.yaml` ; créer `src/layouts` ; n'exporter `Props` que si c'est utile.
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - `src/styles/` → `src/theme/` ; `components/Head.astro` (importe `global.css`) ; `layouts/Layout.astro` ; `data/rooms/rooms.{mock,queries}.ts` ; `partials/catalogue/RoomList.astro` ; `utils/formatPrice.ts` ; `index.astro` ne fait plus qu'assembler ;
  - `Props` sans `export` dans `RoomCard` et `Icon` ;
  - `API_BASE_URL` : `astro.config.mjs` charge le `.env` avec `process.loadEnvFile()`, parce qu'Astro ne place pas le `.env` dans `process.env`, que lit pourtant le client de `core`. Valeur par défaut `http://localhost:4010`, plus un `.env.example` ;
  - URL du mock vérifiée en interrogeant le conteneur qui tournait : `/rooms` → 200, `/api/rooms` → 404. Le mock n'utilise donc pas le préfixe `/api` du contrat ;
  - `architecture.md` mis à jour avec ces décisions, et de nouveaux points ouverts : port de `docker compose up dev`, SSR, `process.env` côté navigateur.
- **Erreurs de l'IA relevées** :
  - le commentaire de `formatPrice` annonçait « 35,5 → 35,50 € », alors que le code renvoyait « 35,5 € ». Repéré en testant la fonction ; code corrigé (centimes affichés quand le montant n'est pas rond) ;
  - le script Python de remplacement supposait l'ancienne mise en forme de `RoomCard.astro`, alors que le fichier avait été reformaté entre-temps. Une partie du remplacement n'a pas pris (`{price}` est resté, pas défini), ce qu'a révélé la relecture. Corrigé avant le contrôle de types ;
  - après ce reformatage, l'espace entre le prix et « / heure » avait disparu (« 45 €<small> »), parce qu'Astro supprime le retour à la ligne entre une expression et une balise. Ajout d'un `{' '}`.
- **Vérification** : `pnpm typecheck` 0 erreur ; `pnpm build` ; page temporaire qui affichait `process.env.API_BASE_URL` : valeur par défaut, puis surcharge par un `.env` de test (page et `.env` supprimés ensuite) ; `curl` de la page de dev (titre « Trouver une salle · Quorum », cartes, prix).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Document d'architecture `docs/architecture.md` (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : écrire un document d'architecture du front pour se coordonner, en s'appuyant sur mon portfolio (`portfolio/apps/landing`, en cours de refonte).
- **Demande** : « Inspecte l'archi de mon portfolio et fais le fichier `architecture.md`. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - l'IA a lu tout `src/` du portfolio et en a tiré ses conventions : `pages/` qui compose, `partials/<page>/` qui va chercher ses données, `components/` réutilisables avec script client à côté (`Background.ts`), `data/<domaine>/<domaine>.{queries,mock,schemas}.ts`, `theme/`, `utils/`, et `Head.astro` qui importe le CSS global ;
  - adaptations à ce projet, écrites comme des écarts assumés : pas de `schemas.ts` (les types viennent de `core`) ; Tailwind et tokens au lieu d'un CSS par composant ; pas d'i18n ; Prettier avec points-virgules (le portfolio n'en met pas) ;
  - une liste « Écarts actuels » (le code déjà écrit ne respecte pas encore le document : `styles/` au lieu de `theme/`, données fictives dans `index.astro`…) et une liste « Points ouverts ».
- **Erreurs de l'IA relevées** :
  - première version : affirmation non vérifiée que le mock se vise avec `API_BASE_URL=http://localhost:4010`. Or le contrat déclare `/api` dans l'URL du serveur ; l'IA ne sait pas si Prism attend ce préfixe. Reformulé en « à vérifier » ;
  - convention choisie par l'IA sans me la demander : `export interface Props` (comme dans mon squelette de `RoomCard`) plutôt que `interface Props` (comme dans le portfolio). À confirmer.
- **Vérification** : points de rupture `md`/`lg` de Tailwind comparés à ceux de la maquette dans `tailwindcss/theme.css` (48rem / 64rem, identiques) ; utilisation de `process.env.API_BASE_URL` dans `core/src/api/client.ts` vérifiée (problème réel côté navigateur) ; `.prettierrc.json` relu.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Retour à `@room-booking/*` et commits gitmoji propres (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : garder le nom d'origine `@room-booking/*` pour tous les paquets (pour rester compatible avec `pnpm core:sync`) et committer le travail proprement, en gitmoji.
- **Demande** : « On garde `@room-booking/` pour tous les paquets. Maintenant fais des commits propres, toujours dans la convention gitmoji. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - les 2 commits précédents (`ab234c3`, `391670a`), non poussés, ont été réécrits plutôt que corrigés par un commit de plus. Sauvegarde sur la branche `backup/avant-recommit` ;
  - `package.json` racine et `packages/core/package.json` remis à leur version d'origine ; front renommé `@room-booking/front`, imports `@room-booking/core` ;
  - un commit par étape : squelette Astro → dépendances → tokens/Tailwind → composants → page d'accueil fictive → journal. Le `pnpm-lock.yaml` de chacun des 2 premiers commits a été régénéré (`pnpm install --lockfile-only`) pour correspondre à son `package.json`.
- **Erreurs de l'IA relevées** :
  - à l'origine, l'IA avait committé le renommage `@booking/*` sans signaler qu'il était incompatible avec `core:sync`. Elle ne l'a vu qu'après coup ; d'où cette réécriture ;
  - dans les anciens commits, `pnpm-lock.yaml` n'était pas cohérent : le premier n'avait pas de lockfile et le second mélangeait toutes les dépendances. Corrigé ici.
- **Vérification** : `pnpm install` (lockfile inchangé, donc cohérent) ; `pnpm typecheck` 0 erreur avec `@room-booking/core` ; `git log` relu.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Commits des dépendances et `RoomCard` d'après la maquette Quorum (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : committer l'installation des dépendances, puis refaire la carte d'après les maquettes (`maquettes/`).
- **Demande** : « Commence par faire les commits pour les deps, puis refais le design : j'ai des maquettes dans `maquettes/`. »
- **Résultat** : _à compléter (accepté tel quel / modifié / rejeté)_
- **Ce qui a été fait** :
  - 2 commits `ab234c3` et `391670a` (renommage en `@booking/*` + dépendances), réécrits ensuite : voir l'entrée « Retour à `@room-booking/*` » ;
  - `maquettes/tokens.css` copié tel quel dans `src/styles/tokens.css`, puis relié à Tailwind dans `global.css` par `@theme inline`. Les palettes par défaut de Tailwind sont retirées (`--color-*: initial`…), ce qui empêche d'écrire une couleur en dur, conformément au README de la maquette. Pour les espacements, la carte utilise directement les tokens : `p-(--space-4)` ;
  - `RoomCard` reconstruite d'après `composants.html` et l'écran 01 : image (décorative, `alt=""`) ou fond de remplacement avec une icône de bâtiment, titre, lieu et capacité (« 12 pers. max ») avec icônes, équipements en étiquettes, prix « 45 € / heure », badge « Inactive » et passage en niveaux de gris pour une salle `INACTIVE` ;
  - nouveau composant `Icon.astro` (tracés SVG repris de la maquette) ;
  - page d'accueil : deux salles fictives de la maquette (Salle Voltaire active, Studio Médoc inactive) dans la grille de l'écran 01. L'image `picsum.photos` a été retirée.
- **Écarts volontaires avec la maquette** : la carte n'a ni lien vers la fiche salle (consigne : « juste visuelle pour l'instant »), ni l'ombre au survol et l'anneau de focus qui vont avec ce lien. Ils seront à ajouter avec la route `/rooms/[id]`.
- **Erreurs de l'IA relevées** :
  - `</html>` oublié dans `index.astro` à la première écriture ; corrigé avant vérification ;
  - `@theme inline` fait émettre par Tailwind des variables qui pointent vers elles-mêmes (`--color-action: var(--color-action)`, dans `@layer theme`). Ça fonctionne parce que `tokens.css` n'est pas dans une couche CSS et l'emporte, ce qui a été vérifié dans le CSS généré. En revanche, si `tokens.css` passe un jour dans une couche, les couleurs disparaissent. Point fragile à connaître ;
  - signalé à l'utilisateur, pas corrigé : le renommage `@room-booking/core` → `@booking/core` dans `packages/core/package.json` (commit `ab234c3`) sera écrasé au prochain `pnpm core:sync`, qui recopie aussi `package.json`. La dépendance `@booking/core` du front ne se résoudra plus.
- **Vérification** : `pnpm typecheck` (0 erreur) ; `pnpm build` ; lecture du CSS généré (classes `bg-surface`, `rounded-lg`, `p-(--space-4)`… bien reliées aux tokens, et vérification des couches pour les variables) ; `curl localhost:4321` (les deux salles, « Inactive », « 45 € <small> »). _À compléter : comparaison visuelle avec `maquettes/composants.html` dans le navigateur._
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Tailwind, `astro check` et aperçu de la `RoomCard` (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : voir la carte sur la page d'accueil avec des données fictives, ajouter Tailwind pour le style et `@astrojs/check` pour vérifier les types.
- **Demande** : « Sur la home, mets-moi une card avec de la data mock ; ajoute `@astrojs/check` et Tailwind pour le style. La carte est juste visuelle pour l'instant. »
- **Résultat** : _à compléter (accepté tel quel / modifié / rejeté)_
- **Ce qui a été fait** :
  - Tailwind 4 ajouté avec `pnpm astro add tailwind` : plugin Vite `@tailwindcss/vite` dans `astro.config.mjs` et `src/styles/global.css` (`@import "tailwindcss"`), importé dans `index.astro`, puisqu'il n'y a pas encore de layout ;
  - styles de la carte réécrits en classes Tailwind, au lieu du `<style>` limité au composant ; la classe `opacity-60` est appliquée sous condition avec `class:list` ;
  - script `pnpm typecheck` (`astro check`) ajouté ;
  - salle fictive typée `Room` dans `index.astro`, avec une image `picsum.photos` ; `lang="en"` remplacé par `lang="fr"`.
- **Erreurs de l'IA relevées** :
  - `pnpm add -D typescript` a installé TypeScript **7.0.2**, alors que `@astrojs/check` 0.9.10 n'accepte que `^5 || ^6` (avertissement de dépendance « peer »). Corrigé en épinglant `typescript@6.0.3`, la version de `core`. L'avertissement restant (`openapi-typescript` veut `^5`) vient de `core` et existait déjà.
- **Vérification** :
  - `pnpm typecheck` : 0 erreur. Pour s'assurer que ce 0 a un sens, une faute a été introduite exprès (`capacity: '20'`) : `astro check` la détecte (`ts(2322)`), puis la faute a été retirée ;
  - `curl localhost:4321` : la page renvoie bien « Salle Paris », « Vidéoprojecteur », « 35,00 » ;
  - _à compléter : rendu visuel dans le navigateur._
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Composant `RoomCard` (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal
- **Objectif** : créer la carte qui présente une salle dans les listes.
- **Demande** : « Créer la roomCard » à partir de mon squelette `RoomCard.astro`, qui importait déjà le type `Room` de `@booking/core` et déclarait `Props { room: Room }`. L'IA a lu le type `Room` généré depuis `openapi.yml`.
- **Résultat** : _à compléter (accepté tel quel / modifié / rejeté)_
- **Erreurs de l'IA relevées** :
  - vérification de typage insuffisante : l'IA a lancé `pnpm build`, qui ne vérifie pas les types et ne compile même pas un composant que rien n'utilise. `@astrojs/check` n'est pas installé. Le build vert ne prouve donc rien sur `RoomCard`.
  - choix faits sans cahier des charges : pas de lien vers la fiche de la salle (la route n'existe pas encore), une salle `INACTIVE` est grisée avec un badge « Indisponible », l'`alt` de l'image reprend le nom de la salle. Ces choix restent à valider.
- **Vérification** : lecture du type `Room` dans `packages/core/src/api/schema.ts` (champs optionnels `description`, `equipment`, `imageUrl` gérés) ; `pnpm build` OK mais insuffisant (voir ci-dessus). _À compléter : affichage réel de la carte sur une page, `astro check`._
- **Ce que j'en retiens** : _à compléter_

---

## Synthèse (à rédiger avant la soutenance)

**Ce que l'IA a bien fait sur ce projet** :

…

**Ses erreurs récurrentes sur mon framework** (API obsolètes, mauvaise version, réactivité, typage…) :

…

**Ce que je ne lui délègue pas, et pourquoi** :

…

**Fiabilité de l'IA sur mon framework** (note de 1 à 5, reportée dans la matrice comparative) : …
