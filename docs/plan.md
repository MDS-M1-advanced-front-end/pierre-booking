# Plan d'action du front Quorum

Ordre de réalisation du site décrit dans [`cadrage.md`](./cadrage.md), en respectant [`architecture.md`](./architecture.md). Le site est déroulé d'un seul tenant, lot par lot. Un lot n'est commencé que lorsque le précédent remplit sa **définition de fini**.

**État au 2026-10-07** : lots 0 à 5 réalisés, lot 6 réalisé sauf 6.5 (synthèse du journal, à rédiger par l'apprenant). Vérification manuelle au lecteur d'écran (6.1) non faite : seul l'audit automatique axe-core l'a été.

## Règles pour tout le plan

- **Un commit gitmoji par étape** (numérotée ci-dessous), en français, sans mention de Claude. Exemples : `:heavy_plus_sign:` dépendance, `:wrench:` configuration, `:truck:` déplacement, `:sparkles:` fonctionnalité, `:lipstick:` style, `:white_check_mark:` tests, `:recycle:` refactor, `:memo:` documentation.
- **À chaque étape** : `pnpm typecheck` **et** `pnpm build` dans `apps/front`. `astro check` ne détecte pas un import CSS cassé, mais le build si.
- **À chaque fin de lot** : `pnpm check` à la racine, tests de bout en bout du lot, vérification visuelle contre la maquette (375 px et 1280 px), entrée dans `docs/ai-journal.md`.
- `packages/core` n'est jamais modifié. Ce qui manque à `core` est noté dans la section « À proposer à `core` ».
- Versions vérifiées le 2026-10-07 : `@astrojs/svelte` 9.0.1 (Astro ^7, Svelte ^5.43, TypeScript ^5.3 ou ^6), `@astrojs/node` 11.1.7 (Astro ^7.2.1), `svelte` 5.57.2, `prettier-plugin-astro` 1.1.0, `prettier-plugin-svelte` 4.1.1, `vitest` 5 (`core` utilise 5.0.2), `@playwright/test` 1.63.0. Attention au `minimumReleaseAge` de `pnpm-workspace.yaml` : une version trop récente devra être exclue explicitement, comme pour `astro`.

---

## Lot 0 — Fondations

| #    | Étape                                                                                                                                                                                                                                                                                                                                                                              | Fini quand                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 0.1  | Réparer `pnpm check` : ignorer `apps/*/.astro`, `apps/*/dist`, `apps/*/test-results`, `apps/*/playwright-report` et la copie de `tokens.css` dans `.prettierignore` ; ajouter `prettier-plugin-astro` et `prettier-plugin-svelte` ; reformater                                                                                                                                     | `pnpm check` passe                                                                      |
| 0.2  | Lint du front : config ESLint dans `apps/front` (typescript-eslint, `eslint-plugin-astro`, `eslint-plugin-svelte`), script `lint`                                                                                                                                                                                                                                                  | `pnpm -r lint` couvre le front                                                          |
| 0.3  | Mise en conformité avec `architecture.md` : `src/styles` → `src/theme`, `components/Head.astro` (importe `global.css`), `layouts/Layout.astro`, `utils/formatPrice.ts` (centimes si le montant n'est pas rond), `Props` non exportées                                                                                                                                              | `index.astro` n'importe plus de CSS ; build OK                                          |
| 0.4  | `API_BASE_URL` : chargement du `.env` dans `astro.config.mjs` (`process.loadEnvFile()`), valeur par défaut `http://localhost:4010`, `.env.example`                                                                                                                                                                                                                                 | Valeur par défaut et surcharge par `.env` vérifiées                                     |
| 0.5  | Ajouter `@astrojs/svelte` + `svelte`                                                                                                                                                                                                                                                                                                                                               | Un composant Svelte de test s'affiche en statique et en îlot                            |
| 0.6  | Ajouter `@astrojs/node` (`standalone`) ; `prerender = false` possible page par page                                                                                                                                                                                                                                                                                                | `pnpm build` produit un serveur ; `pnpm preview` sert l'accueil                         |
| 0.7  | `vite.define` pour `process.env.API_BASE_URL` (le client de `core` dans le navigateur)                                                                                                                                                                                                                                                                                             | Un appel `searchRooms()` depuis un îlot atteint le mock                                 |
| 0.8  | Script `dev` : `astro dev --host 0.0.0.0` (port 4321) + port `4321` publié dans `compose.yaml` (5173 abandonné, voir `cadrage.md` § 2.9)                                                                                                                                                                                                                                           | `pnpm dev` et `docker compose up dev` servent le site sur `:4321`                       |
| 0.9  | **Vitest centralisé, projets nommés** : `vitest` à la racine, `vitest.config.ts` racine avec `test.projects` : `core`, `front:utils`, `front:data`, `front:components` (voir `cadrage.md` § 2.8) ; dépendances `jsdom` et `@testing-library/svelte` pour `front:data` et `front:components` ; script racine `test` → `vitest run` ; premier test sur `formatPrice` (`front:utils`) | `pnpm test` lance tous les projets ; `pnpm test --project front:utils` n'en lance qu'un |
| 0.10 | **Playwright** dans `apps/front` : `playwright.config.ts` (`webServer` : mock Prism + `astro dev`), dossier `e2e/`, script `test:e2e` ; premier test : l'accueil affiche des salles                                                                                                                                                                                                | `pnpm --filter @room-booking/front test:e2e` passe                                      |

## Lot 1 — Interface de base

| #    | Étape                                                                                                                                                                                                     | Fini quand                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1.1  | Styles de base manquants : focus visible global, `visually-hidden`, lien d'évitement, `prefers-reduced-motion`                                                                                            | Navigation au clavier : focus visible partout                     |
| 1.2  | `Icon` (Svelte), avec toutes les icônes de la maquette                                                                                                                                                    | Utilisé par `RoomCard`                                            |
| 1.3  | `Button` (variantes, tailles, rendu `<a>`)                                                                                                                                                                | Conforme à `composants.html` § Button                             |
| 1.4  | `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, suffixe ; **messages de validation** : traduction du `ValidityState` du navigateur en messages français de la maquette (`utils/validationMessage.ts`) | États normal, erreur, aide, désactivé ; tests Vitest des messages |
| 1.5  | `Badge`, `StatusBadge` (pastilles de formes différentes)                                                                                                                                                  | Les 6 statuts                                                     |
| 1.6  | `Alert` (danger, succès, info)                                                                                                                                                                            | Bons rôles ARIA                                                   |
| 1.7  | `Modal` (`<dialog>` + `showModal()`, retour du focus)                                                                                                                                                     | Échap ferme ; le focus revient au déclencheur                     |
| 1.8  | `RoomCard` migrée en Svelte : lien sur le titre, carte entièrement cliquable, survol, focus ; suppression de la version Astro                                                                             | Rendu identique à la maquette                                     |
| 1.9  | `EmptyState`, `Skeleton`, `ErrorState`, `Pagination`, `SegmentedNav`, `DatePager`                                                                                                                         | Conformes à `composants.html` § États                             |
| 1.10 | `Layout` : `SiteHeader` (version visiteur pour l'instant, menu mobile `<details>`), `SiteFooter`, conteneur `--size-container`                                                                            | En-tête et pied de page de la maquette sur l'accueil              |
| 1.11 | Pages `404` et `/acces-refuse`                                                                                                                                                                            | Accessibles et stylées                                            |

## Lot 2 — Données, session, logique

| #   | Étape                                                                                                                                                           | Fini quand                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2.1 | `data/<domaine>/*.queries.ts` pour `rooms`, `reservations`, `auth`, `users` : enveloppes des fonctions de `core` telles quelles, erreurs normalisées            | Typecheck ; aucune page n'importe `core` directement                                         |
| 2.2 | `utils` : `formatDate`, `formatTime`, `formatDateRange` (Europe/Paris), `parisToUtcIso` (avec changement d'heure), `splitIntoHourlySlots`                       | Tests Vitest, y compris les dates de changement d'heure                                      |
| 2.3 | Logique du SlotPicker (sélection de plage contiguë, refus d'inclure un créneau indisponible, plage d'origine sélectionnable en modification), en TypeScript pur | Tests Vitest                                                                                 |
| 2.4 | Session : `session.svelte.ts` (`restoreSession`, `saveSession`, `clearSession`, expiration), gestion des `401`                                                  | Tests Vitest (avec un faux `localStorage`)                                                   |
| 2.5 | Garde `RequireAuth` (connecté, rôle) avec redirection `?redirect=`                                                                                              | Un visiteur sur `/reservations` arrive sur `/connexion?redirect=/reservations`               |
| 2.6 | `mockPersona.ts` en développement seulement                                                                                                                     | Connexion avec `gestionnaire1@salles.example` → Nadia Benali ; absent du build de production |
| 2.7 | `SiteHeader` selon la session (visiteur, client, gestionnaire) + déconnexion                                                                                    | Les 3 variantes de navigation                                                                |

## Lot 3 — Écrans publics

| #   | Étape                                                                                                                                                       | Fini quand                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 3.1 | Essai du cache de route d'Astro 7 avec `@astrojs/node` (`/` : 60 s + `swr` 300 s ; `/salles/[id]` : 300 s + `swr` 3600 s) ; sinon repli sur `Cache-Control` | Décision notée dans `cadrage.md` § 2.1 |
| 3.2 | **01 Catalogue** : `searchRooms` avec les paramètres d'URL, `Filters` (lieux déduits des salles), `RoomList`, `Pagination`, états                           | Critères de l'écran 01                 |
| 3.3 | **02 Fiche salle** : `getRoom` côté serveur, 404, `RoomHero`, équipements                                                                                   | Rendu serveur conforme                 |
| 3.4 | **02** : îlot `BookingPanel` (`DatePager`, `SlotPicker`, récapitulatif, formulaire, `createReservation`, `409`, visiteur)                                   | Critères de l'écran 02                 |
| 3.5 | E2E visiteur : catalogue → filtre → fiche → « Se connecter pour réserver »                                                                                  | `test:e2e` passe                       |

## Lot 4 — Authentification et espace client

| #   | Étape                                                                                                                     | Fini quand                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 4.1 | **03 Connexion**                                                                                                          | Critères de l'écran 03, avec les deux profils    |
| 4.2 | **04 Inscription** (récapitulatif d'erreurs focalisé, connexion automatique)                                              | Critères de l'écran 04                           |
| 4.3 | **05 Profil** : modification des informations (`role` jamais envoyé) + **changement de mot de passe**                     | Corps des requêtes vérifiés dans l'onglet Réseau |
| 4.4 | **06 Mes réservations** (filtres, sections, cache des noms de salle, modale d'annulation)                                 | Critères de l'écran 06                           |
| 4.5 | **07 Modifier une réservation** (`409`, saisie conservée)                                                                 | Critères de l'écran 07                           |
| 4.6 | E2E client : connexion → réservation (corps du `POST` vérifié) → mes réservations → annulation ; inscription avec erreurs | `test:e2e` passe                                 |

## Lot 5 — Espace gestionnaire

| #   | Étape                                                                                                                                            | Fini quand                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 5.1 | **08 Mes salles** (filtre `ownerId`, tableau qui s'empile en mobile, suppression)                                                                | Les 5 salles de `gestionnaire-1`                                         |
| 5.2 | **09 Ajouter / modifier une salle** (objet complet, aperçu en direct)                                                                            | Création et modification envoient un corps valide (pas de `400` du mock) |
| 5.3 | **10 Disponibilités** (édition, découpage horaire, vue client)                                                                                   | Corps du `PUT` conforme                                                  |
| 5.4 | **11 Demandes** (confirmer, refuser avec motif, noms des demandeurs)                                                                             | Critères de l'écran 11                                                   |
| 5.5 | Compteur « Demandes (n) » dans l'en-tête gestionnaire                                                                                            | Visible sur toutes les pages gestionnaire                                |
| 5.6 | E2E gestionnaire : connexion → mes salles → modification → disponibilités → refus d'une demande ; un client sur `/gestion/salles` → accès refusé | `test:e2e` passe                                                         |

## Lot 6 — Finitions

| #   | Étape                                                                                                               | Fini quand                                    |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 6.1 | Passe accessibilité : clavier sur les 11 écrans, lecteur d'écran sur 02 et 04, contrastes, `prefers-reduced-motion` | Liste de contrôle du cadrage § 6 cochée       |
| 6.2 | Passe responsive 375 px / 768 px / 1280 px sur tous les écrans                                                      | Captures comparées à la maquette              |
| 6.3 | Titres d'onglet, `meta description` des pages publiques                                                             | —                                             |
| 6.4 | Nettoyage : TODO, code mort, `architecture.md` à jour                                                               | `pnpm check` et `test:e2e` passent            |
| 6.5 | Journal IA : synthèse                                                                                               | Section « Synthèse » remplie avec l'apprenant |

---

## À proposer à `core`

À remonter en séance, puis récupérer avec `pnpm core:sync` :

- schémas Zod des requêtes : **prévus par `core`**. Le front les branchera sur ses formulaires à leur arrivée, à la place des contraintes HTML ;
- fonction d'estimation du prix annoncée par la maquette (le front n'affiche pas d'estimation en attendant) ;
- `process.env.API_BASE_URL` → valeur injectable (fonction `configure({ baseUrl })`), pour ne plus dépendre de `vite.define` ;
- exposer l'ajout d'un middleware (ex. pour l'en-tête `Prefer` du mock) au lieu d'envelopper `fetch`.

## Décisions validées le 2026-10-07

1. Cache : `/` 60 s + `swr` 300 s ; `/salles/[id]` 300 s + `swr` 3600 s.
2. `mockPersona` en développement pour l'en-tête `Prefer` du mock.
3. Pas de schémas Zod dans le front : on utilise les fonctions de `core` telles qu'elles sont, `core` ajoutera Zod plus tard.
4. Tests unitaires Vitest centralisés à la racine + tests de bout en bout Playwright.
5. Script `dev` sur `0.0.0.0:4321` (5173 abandonné à l'implémentation : conflit avec le conteneur du mock).
6. Liste des lieux évolutive, déduite des salles.
7. Connexion automatique après l'inscription.
8. Changement de mot de passe sur le profil.
9. Créneaux de la réservation modifiée sélectionnables.
10. Pas d'estimation de prix (écrans 02 et 07).
11. Vitest organisé en projets nommés : `core`, `front:utils`, `front:data`, `front:components`.
