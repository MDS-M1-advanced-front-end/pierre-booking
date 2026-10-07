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
