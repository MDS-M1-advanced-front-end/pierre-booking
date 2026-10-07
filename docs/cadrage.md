# Cadrage du front Quorum

Ce document décrit **ce qu'on construit et comment**, avant d'écrire le code. Il complète [`architecture.md`](./architecture.md) (où ranger les fichiers) ; l'ordre de réalisation est dans [`plan.md`](./plan.md).

Sources : maquette `maquettes/` (README, `composants.html`, 11 écrans), contrat `packages/core/openapi.yml`, client `@room-booking/core`, mock Prism (`mock/`).

Toutes les décisions ont été validées le 2026-10-07 (voir la fin de [`plan.md`](./plan.md)).

---

## 1. Périmètre

**Dans le périmètre** : les 11 écrans de la maquette, parcours Socle (01 à 07) et espace gestionnaire Standard (08 à 11), en mobile (375 px) et desktop (1280 px).

**Hors périmètre** : paiement simulé, back-office administrateur, PWA, mot de passe oublié (pas d'endpoint), Storybook (séance 5), comportement clavier avancé du SlotPicker (séance 6, on livre une base accessible).

**Ajouté par rapport à la maquette** : pages « Accès refusé » (403) et « Page introuvable » (404), qui sont nécessaires pour les gardes de route ; changement de mot de passe sur le profil (écran 05).

## 2. Décisions techniques

### 2.1 Rendu

| Type de page        | Écrans                       | Rendu                                                   | Pourquoi                                                                        |
| ------------------- | ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Publique, indexable | 01 Catalogue, 02 Fiche salle | **SSR + cache de route** (équivalent ISR)               | Filtres en paramètres d'URL, recherche partageable, référencement               |
| Authentification    | 03 Connexion, 04 Inscription | **Statique** (page pré-rendue) + îlot Svelte            | Aucune donnée serveur ; le formulaire vit dans le navigateur                    |
| Espace connecté     | 05 à 11                      | **Coquille rendue serveur** + îlot Svelte `client:only` | Le jeton est dans le `localStorage`, donc seul le navigateur peut appeler l'API |

- Adaptateur : `@astrojs/node` en mode `standalone`, `output: 'static'` par défaut, et `export const prerender = false` sur les pages SSR (01, 02, routes dynamiques 07, 09, 10).
- **« ISR » avec Astro 7** : Astro 7 fournit un cache de route (`cache.provider: memoryCache()` + `routeRules` avec `maxAge` / `swr`), vérifié dans les types de `astro@7.3.6`. Règles retenues :
  - `/` : `maxAge: 60, swr: 300` ; `/salles/[id]` : `maxAge: 300, swr: 3600`.
  - Limite : les écritures (création ou modification de salle) partent du navigateur vers l'API, donc le serveur Astro ne peut pas invalider le cache. On compte sur la courte durée de vie (`maxAge`).
  - À tester en début de lot 3 : si le cache de route ne fonctionne pas avec l'adaptateur Node, on se rabat sur un en-tête `Cache-Control: s-maxage=…, stale-while-revalidate=…`.
- **Une page mise en cache n'est jamais personnalisée.** Tout ce qui dépend de la session (en-tête de navigation, bouton « Réserver » ou « Se connecter pour réserver ») est un îlot rendu dans le navigateur.

### 2.2 Interactivité : Svelte

- Intégration `@astrojs/svelte` (Svelte 5, runes).
- **Composants d'interface partagés écrits en Svelte** (`Button`, `Badge`, `Alert`, `Field`, `Modal`, `RoomCard`…). Astro sait rendre un composant Svelte en HTML statique (sans directive `client:*`), donc **une seule implémentation** sert aux pages Astro et aux îlots. `RoomCard` et `Icon` passent d'Astro à Svelte : la carte sert aussi dans l'aperçu de l'écran 09, qui est un îlot.
- Restent en Astro : pages, `Layout`, `Head`, sections purement serveur (liste du catalogue, en-tête de la fiche salle).
- Directive : `client:only="svelte"` pour tout ce qui lit la session ; `client:load` pour les îlots publics (SlotPicker de la fiche salle).

### 2.3 Session et authentification

- Stockage **`localStorage`**, clé `quorum.session` : `{ accessToken, user, expiresAt }` (`expiresAt` = maintenant + `expiresIn`).
- Le client de `core` garde le jeton dans une variable du module, perdue à chaque page. Chaque îlot connecté commence donc par `restoreSession()` : il lit le `localStorage`, appelle `setAccessToken()`, puis expose l'utilisateur via un état Svelte (`session.svelte.ts`).
- **Pas de renouvellement du jeton** (aucune route de rafraîchissement dans le contrat) : si `expiresAt` est dépassé ou si l'API répond `401`, on vide la session et on redirige vers `/connexion?redirect=<page>`.
- Déconnexion : `logout()` de `core` + suppression de la clé + retour au catalogue.
- **Gardes** (dans le navigateur, avant d'afficher le contenu) : non connecté → `/connexion?redirect=…` ; mauvais rôle → page « Accès refusé ». Ce n'est qu'un confort d'interface : la vraie sécurité est l'API, qui contrôle les droits sur chaque requête.
- **Règle** : `setAccessToken()` n'est **jamais** appelé côté serveur. La variable du module y serait partagée entre tous les visiteurs.
- Risque accepté : un jeton dans le `localStorage` est lisible par n'importe quel script injecté (XSS). En contrepartie : jamais de `{@html}` ni de `set:html` sur une donnée venant de l'API.

### 2.4 Accès à l'API

- Tous les appels passent par `src/data/<domaine>/<domaine>.queries.ts`, qui enveloppe les fonctions de `core` et transforme un `Result` en erreur `{ ok: false }` exploitable par l'interface (message, statut).
- **`process.env` dans le navigateur** : le client de `core` lit `process.env.API_BASE_URL`. On le remplace au build avec `vite.define` dans `astro.config.mjs`. Conséquence : l'URL de l'API est **figée au build**, ce qui est acceptable pour ce projet.
- CORS : le mock Prism accepte les appels depuis `localhost:4321` (vérifié : prévol `OPTIONS` en 204, `Authorization` autorisé).
- Données fictives : les fichiers `*.mock.ts` ne servent plus une fois l'API branchée. On les supprime au lot 3 ; le mock Prism devient la source de développement.

### 2.5 Mock Prism et profils de test

- Prism est **sans état** : une création ou une modification répond correctement, mais la liste suivante ne la contient pas. C'est normal et documenté.
- `POST /auth/login` renvoie **toujours Léa Martin (client)**, quel que soit l'e-mail (vérifié). Pour tester l'espace gestionnaire, il faut l'en-tête `Prefer: example=gestionnaire-1`.
- En développement seulement (`import.meta.env.DEV`), un petit module `src/data/auth/mockPersona.ts` enveloppe `fetch` et ajoute `Prefer: example=<profil>` sur `/auth/login` et `/auth/me`. Le profil se déduit de l'e-mail saisi : `gestionnaire1@salles.example` → `gestionnaire-1`. Le module est retiré du bundle de production.

### 2.6 Validation des formulaires

- `core` n'a **pas encore** de schémas Zod, malgré ce qu'annonce son README (vérifié : seul `src/api/` existe). **Décision** : le front utilise les fonctions de `core` telles qu'elles sont et **n'écrit pas ses propres schémas**. C'est `core` qui ajoutera Zod ; on le branchera après un `pnpm core:sync`.
- En attendant : contraintes HTML natives (`required`, `type="email"`, `minlength`, `min`, `max`, `type="url"`), lues par l'API de validation du navigateur (`ValidityState`) dans le composant `Field`, qui affiche les messages en français de la maquette. Les erreurs `400` du serveur restent le dernier filet.
- Validation à la soumission, puis à la sortie de chaque champ en erreur. Messages reliés par `aria-describedby`, `aria-invalid="true"`, et sur les formulaires longs (inscription, salle), récapitulatif d'erreurs focalisé avec des liens vers les champs.
- Erreurs serveur : `400` → message générique dans l'alerte ; `409` → message propre au cas (e-mail déjà utilisé, créneau pris) ; `401` → session expirée (voir 2.3).

### 2.7 Dates, heures et prix

- Le contrat renvoie `startAt` / `endAt` en **UTC**. Affichage en **heure de Paris** avec `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })`.
- Les créneaux (`AvailabilitySlot.startTime`, format `time`) n'indiquent pas de fuseau. **Hypothèse** : heure de Paris (le mock va de 08:00 à 19:00). Création de réservation : date + heure de Paris → ISO UTC, avec gestion du changement d'heure. À signaler au module Back-end.
- **Pas de prix estimé** (écrans 02, 07) : le contrat ne renvoie aucun prix avant `POST /reservations`, et `core` n'a pas la fonction d'estimation annoncée par la maquette. **Décision** : on n'affiche pas d'estimation. Le récapitulatif montre la date, l'horaire, la durée et le tarif horaire de la salle (« 3 h · 45 € / heure »), suivis de la mention « Le montant définitif s'affiche dans « Mes réservations » ». Le prix réel est le `totalAmount` renvoyé par le serveur, affiché sur les écrans 06 et 11. À reprendre si `core` ajoute l'estimation.
- Format : `formatPrice` (existant) ; à ajouter : `formatDate`, `formatTime`, `formatDateRange`.

### 2.8 Qualité

- `pnpm check` (typecheck, lint, format, tests) doit passer à la fin de chaque lot. **Il échoue aujourd'hui** : Prettier analyse `apps/front/.astro/`, `dist/`, la copie de `tokens.css`, et ne sait pas formater `.astro` ni `.svelte`. Correction au lot 0.
- **Tests unitaires : Vitest, centralisé à la racine, avec des projets nommés.** Un seul `vitest.config.ts` à la racine déclare des projets (`test.projects`, chacun avec un `name`, ses fichiers et son environnement) :

  | Projet             | Fichiers                                 | Environnement           | Contenu                                                                              |
  | ------------------ | ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
  | `core`             | `packages/core/src/**/*.test.ts`         | `node`                  | tests de `core` (s'il en ajoute)                                                     |
  | `front:utils`      | `apps/front/src/utils/**/*.test.ts`      | `node`                  | formatage, fuseaux, découpage horaire, messages de validation                        |
  | `front:data`       | `apps/front/src/data/**/*.test.ts`       | `jsdom`                 | session (`localStorage`), normalisation des erreurs des `queries`, `mockPersona`     |
  | `front:components` | `apps/front/src/components/**/*.test.ts` | `jsdom` + plugin Svelte | logique et rendu des composants (SlotPicker, Field…), avec `@testing-library/svelte` |

  `pnpm test` lance tous les projets ; `pnpm test --project front:utils` (ou `--project 'front:*'`) n'en lance qu'une partie. Un nouveau dossier testé = un nouveau projet `front:<dossier>`.

- **Tests de bout en bout : Playwright** (`@playwright/test` 1.63). C'est l'outil qui pilote un vrai navigateur (Chromium, Firefox, WebKit) et rejoue les parcours comme un utilisateur. Dossier `apps/front/e2e/`. Le serveur de dev et le mock Prism sont lancés par la config Playwright (`webServer`). Script `pnpm test:e2e`, séparé de `pnpm check` (il faut les navigateurs installés et le mock).
- Parcours de bout en bout visés : visiteur (catalogue → filtres → fiche → « Se connecter pour réserver ») ; client (connexion → réservation → mes réservations → annulation) ; gestionnaire (connexion → mes salles → modification → disponibilités → demandes). Prism étant sans état, les tests vérifient **la requête envoyée** (`page.waitForRequest`, corps attendu) et l'affichage de la réponse, pas la persistance.
- Vérification manuelle de chaque écran contre la maquette, en mobile et en desktop, avec les profils `client-1` et `gestionnaire-1`.

### 2.9 Docker

`docker compose up dev` publiait 3000, 4200 et 5173, mais Astro écoute sur 4321, et seulement sur `localhost` par défaut. Première décision : `astro dev --port 5173`. **Abandonnée à l'implémentation** : quand le mock tourne dans Docker, le port 5173 de la machine est déjà pris par le conteneur, et Astro 7 refuse un second serveur de dev dans le même projet. **Retenu** : `astro dev --host 0.0.0.0` (port 4321) et `4321:4321` ajouté aux ports publiés dans `compose.yaml`. Le même port fonctionne avec ou sans Docker, et Playwright réutilise le serveur déjà lancé.

---

## 3. Routes

| #   | Écran                        | Route                                                       | Rendu                            | Accès                        |
| --- | ---------------------------- | ----------------------------------------------------------- | -------------------------------- | ---------------------------- |
| 01  | Catalogue                    | `/`                                                         | SSR + cache                      | Public                       |
| 02  | Fiche salle                  | `/salles/[id]`                                              | SSR + cache                      | Public (réserver : connecté) |
| 03  | Connexion                    | `/connexion`                                                | Statique                         | Visiteur                     |
| 04  | Inscription                  | `/inscription`                                              | Statique                         | Visiteur                     |
| 05  | Profil                       | `/profil`                                                   | Statique + îlot                  | Connecté                     |
| 06  | Mes réservations             | `/reservations`                                             | Statique + îlot                  | Connecté                     |
| 07  | Modifier une réservation     | `/reservations/[id]/modifier`                               | SSR (coquille) + îlot            | Connecté                     |
| 08  | Mes salles                   | `/gestion/salles`                                           | Statique + îlot                  | `GESTIONNAIRE`               |
| 09  | Ajouter / modifier une salle | `/gestion/salles/nouvelle`, `/gestion/salles/[id]/modifier` | Statique / SSR (coquille) + îlot | `GESTIONNAIRE`               |
| 10  | Disponibilités               | `/gestion/salles/[id]/disponibilites`                       | SSR (coquille) + îlot            | `GESTIONNAIRE`               |
| 11  | Demandes                     | `/gestion/demandes`                                         | Statique + îlot                  | `GESTIONNAIRE`               |
| —   | Accès refusé                 | `/acces-refuse`                                             | Statique                         | —                            |
| —   | Page introuvable             | `404.astro`                                                 | Statique                         | —                            |

Les filtres passent par les paramètres d'URL : `/?location=…&capacityMin=10&date=…&page=2`, `/reservations?status=PENDING`, `/salles/[id]?date=2026-11-16`.

**Navigation de l'en-tête** (îlot, selon la session) :

- visiteur : Catalogue · Se connecter · Créer un compte ;
- client : Catalogue · Mes réservations · prénom (→ profil) · Se déconnecter ;
- gestionnaire : Catalogue · Mes salles · Demandes (nombre en attente) · prénom (→ profil) · Se déconnecter.

En mobile, la navigation passe dans un `<details>` (menu). Un lien d'évitement « Aller au contenu » est présent sur toutes les pages.

## 4. Écrans

Pour chaque écran : données, composants, états, anomalies du contrat et critères d'acceptation.

### 01 Catalogue — `/`

- **Données** : `searchRooms({ search, location, capacityMin, capacityMax, date, startTime, endTime, available, page, pageSize: 6 })`, lues dans les paramètres d'URL (6 par page comme la maquette).
- **Composants** : `Filters` (formulaire `GET` sans JavaScript, replié dans un `<details>` en mobile, badge « N actifs »), `RoomList` → `RoomCard`, `ResultsBar` (`role="status"`), `Pagination`.
- **États** : liste ; vide (« Aucune salle ne correspond », lien pour réinitialiser) ; erreur API (alerte + réessayer).
- **Anomalies** : la liste des lieux du filtre n'a pas d'endpoint. **Décision** : liste évolutive, déduite des salles (`searchRooms()` sans filtre, toutes les pages, lieux distincts triés), mise en cache avec la page. Un nouveau lieu apparaît sans changer le code.
- **Accepté si** : les filtres modifient l'URL et le résultat ; la page fonctionne sans JavaScript ; la carte mène à `/salles/[id]` (toute la carte cliquable, un seul lien annoncé).

### 02 Fiche salle — `/salles/[id]`

- **Données** : `getRoom(id)` côté serveur (`404` → page introuvable) ; `getRoomAvailability(id, { date })` dans le navigateur.
- **Composants** : `RoomHero` (image ou fond de remplacement), équipements, îlot `BookingPanel` = `DatePager` + `SlotPicker` + récapitulatif + formulaire (participants ≤ capacité, commentaire).
- **Sélection** : un premier clic choisit le début, un second la fin ; plage contiguë ; un créneau indisponible ne peut pas être inclus.
- **États** : chargement des créneaux (squelette) ; aucun créneau ce jour ; visiteur → bouton « Se connecter pour réserver » (`/connexion?redirect=/salles/[id]`) ; `409` → « Ce créneau n'est plus disponible » ; succès → redirection vers `/reservations` avec message de confirmation.
- **Anomalies** : pas de prix avant `POST /reservations` → pas d'estimation, tarif horaire et durée seulement (§ 2.7).
- **Accepté si** : la durée suit la sélection ; l'état des créneaux ne repose pas que sur la couleur (barré, bordure pointillée) ; `POST /reservations` part avec un `startAt`/`endAt` UTC correct.

### 03 Connexion — `/connexion`

- **Données** : `login({ email, password })`.
- **États** : `401` → alerte générique « Adresse e-mail ou mot de passe incorrect » ; succès → `redirect` ou, par défaut, `/reservations` (client) ou `/gestion/salles` (gestionnaire).
- **Anomalies** : pas de « mot de passe oublié » (aucun endpoint).
- **Accepté si** : session enregistrée (§ 2.3) ; un utilisateur déjà connecté est redirigé.

### 04 Inscription — `/inscription`

- **Données** : `register(...)`, puis `login` automatique avec les mêmes identifiants et redirection vers le catalogue (ou vers `redirect`).
- **Validation** : contraintes HTML (`email` au bon format, mot de passe de 8 caractères minimum, prénom et nom obligatoires), messages de la maquette, récapitulatif d'erreurs focalisé.
- **États** : `409` → « Un compte existe déjà avec cette adresse ».

### 05 Profil — `/profil`

- **Données** : `getMe()` ; `updateUser(user.id, { firstName, lastName, email })`, **sans jamais envoyer `role`**.
- **Composants** : formulaire, bloc « Mon compte » (rôle en badge, membre depuis).
- **États** : succès → `role="status"` « Vos informations ont été enregistrées » ; met à jour la session.
- **Changement de mot de passe** (ajouté, absent de la maquette) : la maquette dit qu'aucun endpoint ne le permet, mais `core` expose `changePassword({ currentPassword, newPassword })` (`PATCH /auth/password`, 204). Bloc « Changer mon mot de passe » sous le formulaire : mot de passe actuel, nouveau (8 caractères minimum), confirmation (vérifiée côté client) ; succès → `role="status"` et champs vidés ; erreur `400`/`401` → « Mot de passe actuel incorrect » (hypothèse, le contrat ne précise pas le code).

### 06 Mes réservations — `/reservations`

- **Données** : `listMyReservations({ status })` ; nom des salles via `getRoom` pour chaque `roomId` distinct, mis en cache en mémoire le temps de la page.
- **Composants** : `SegmentedNav` (filtre par statut, dans l'URL), `ReservationItem` (date, salle, `StatusBadge`, prix, commentaire, actions), sections « À venir » et « Passées, refusées ou annulées », `Modal` d'annulation.
- **Règles** : « Modifier » et « Annuler » seulement pour une réservation `PENDING` ou `CONFIRMED` à venir.
- **Annulation** : `cancelReservation(id)` (204) après confirmation dans la modale.
- **États** : vide (« Aucune réservation », lien vers le catalogue) ; message de confirmation après une réservation créée (paramètre `?created=1`).

### 07 Modifier une réservation — `/reservations/[id]/modifier`

- **Données** : `getReservation(id)`, `getRoom(roomId)`, `getRoomAvailability` ; `updateReservation(id, …)`.
- **Composants** : mêmes que 02 (`SlotPicker`, récapitulatif « Avant / Après » sur l'horaire, avec le montant actuel `totalAmount` pour « Avant » seulement), présélection de la plage actuelle.
- **États** : `409` → alerte, la saisie est conservée ; réservation non modifiable → message et retour.
- **Anomalies** : les créneaux de la réservation en cours sont peut-être renvoyés comme indisponibles. **Décision** : on les rend sélectionnables côté client.

### 08 Mes salles — `/gestion/salles`

- **Données** : `searchRooms()` puis filtre côté client `room.ownerId === user.id` (pas de filtre `ownerId` dans le contrat) ; toutes les pages sont parcourues.
- **Composants** : `Table` qui s'empile en mobile (`data-label`), vignette, `StatusBadge` (Active / Inactive, lecture seule), actions Disponibilités / Modifier / Supprimer, `Modal` de suppression.
- **Suppression** : `deleteRoom(id)` après confirmation.
- **Anomalies** : `status` absent des requêtes de création et de modification, donc statut en lecture seule ; les salles `INACTIVE` sont peut-être absentes de `GET /rooms`.

### 09 Ajouter / modifier une salle

- **Données** : `getRoom(id)` en modification ; `createRoom` / `updateRoom` avec **l'objet complet** (anomalie : `RoomUpdateRequest` reprend les champs requis).
- **Composants** : formulaire (nom, description, lieu, capacité avec suffixe « pers. », tarif avec suffixe « € / h », équipements en cases à cocher, URL de photo), **aperçu en direct** avec `RoomCard`.
- **Validation** : contraintes HTML (capacité ≥ 1, tarif ≥ 0, URL valide si renseignée).
- **Équipements proposés** : liste du jeu de données (10 valeurs de la maquette), dans `data/rooms/equipment.ts`.

### 10 Disponibilités — `/gestion/salles/[id]/disponibilites`

- **Données** : `getRoom(id)`, `getRoomAvailability(id, { date })` ; `setRoomAvailability(id, { date, slots })`.
- **Composants** : `DatePager`, liste éditable de plages (début, fin, réservable, supprimer), « Ajouter un créneau », alerte d'information « L'enregistrement remplace tous les créneaux de cette journée », aperçu « Vue client » (`SlotPicker` inerte).
- **Règle** : une plage de plusieurs heures est découpée en créneaux d'une heure avant l'envoi (`utils/splitIntoHourlySlots.ts`, testé).
- **Anomalies** : `roomId` absent du `PUT` dans le contrat ; le contournement de la séance 2 est déjà dans `core` (`setRoomAvailability(roomId, body)`).

### 11 Demandes — `/gestion/demandes`

- **Données** : `listMyReservations()`. Hypothèse de la maquette : pour un gestionnaire, la route renvoie les réservations de ses salles. Noms des salles via `getRoom`, des demandeurs via `getUser(userId)` (droits non précisés : si `403`, on affiche « Client »).
- **Composants** : sections « En attente (n) » et « Traitées récemment », `ReservationItem` avec « Confirmer » / « Refuser », `Modal` de refus avec motif facultatif.
- **Actions** : `confirmReservation(id)`, `rejectReservation(id, { reason })` ; succès → `role="status"`.

## 5. Composants d'interface

Source : `maquettes/composants.html`. En Svelte (§ 2.2) dans `src/components/`, sauf mention.

| Composant                                           | Variantes / remarques                                                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Button`                                            | `primary`, `secondary`, `ghost`, `danger` ; tailles `md` (44 px), `sm` ; `icon` ; `block` ; rendu `<a>` si `href`      |
| `Field` + `Input`, `Select`, `Textarea`, `Checkbox` | libellé, `*` obligatoire, aide, erreur (`aria-describedby`, `aria-invalid`), suffixe                                   |
| `Badge` / `StatusBadge`                             | `pending`, `confirmed`, `rejected`, `cancelled`, `completed`, `neutral` ; pastille de forme différente selon le statut |
| `Alert`                                             | `danger` (`role="alert"`), `success` (`role="status"`), `info` ; titre, liste                                          |
| `Modal`                                             | `<dialog>` natif + `showModal()`, en-tête, corps, pied de page                                                         |
| `RoomCard`                                          | migrée d'Astro vers Svelte ; lien sur le titre, toute la carte cliquable, survol, focus                                |
| `SlotPicker`                                        | grille de créneaux `aria-pressed` / `aria-disabled`, légende, statut de la sélection                                   |
| `DatePager`                                         | jour précédent / suivant + champ date                                                                                  |
| `Pagination`, `SegmentedNav`                        | `aria-current="page"`                                                                                                  |
| `ReservationItem`                                   | bloc de date, titre, badge, prix, commentaire, actions                                                                 |
| `Table`                                             | s'empile en mobile                                                                                                     |
| `EmptyState`, `Skeleton`, `ErrorState`              | états vide, chargement, erreur                                                                                         |
| `Icon`                                              | migré en Svelte, mêmes tracés que la maquette                                                                          |
| `SiteHeader`, `SiteFooter`                          | en-tête = îlot (session) ; pied de page = Astro                                                                        |

## 6. Accessibilité (WCAG 2.2 AA)

On reprend les règles du README de la maquette : focus visible (3 px + 2 px de décalage), cibles de 44 px (jamais sous 24 px), statuts qui ne reposent pas sur la seule couleur, erreurs reliées aux champs, `role="status"` / `role="alert"`, `<dialog>` natif, `prefers-reduced-motion`, lien d'évitement, `lang="fr"`, un seul `h1` par page, titres d'onglet « <Page> · Quorum ».

## 7. Anomalies du contrat et contournements

| #   | Anomalie                                                    | Écrans     | Contournement retenu                                                              |
| --- | ----------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| 1   | Pas de prix avant réservation                               | 02, 07     | Pas d'estimation : tarif horaire et durée ; `totalAmount` affiché après création  |
| 2   | `RoomUpdateRequest` = champs requis de la création          | 09         | `PATCH` avec l'objet complet                                                      |
| 3   | `roomId` absent du `PUT` de disponibilités                  | 10         | Déjà contourné dans `core`                                                        |
| 4   | Pas de liste des réservations des salles d'un gestionnaire  | 11         | Hypothèse : `GET /reservations` les renvoie pour un `GESTIONNAIRE`                |
| 5   | Pas de filtre `ownerId` sur `GET /rooms`                    | 08         | Filtre côté client, toutes les pages parcourues                                   |
| 6   | `status` absent des requêtes de salle                       | 08, 09     | Statut en lecture seule                                                           |
| 7   | `UserUpdateRequest` accepte `role`                          | 05         | Le front n'envoie jamais `role`                                                   |
| 8   | `Reservation` ne contient que `roomId` / `userId`           | 06, 11     | `getRoom` / `getUser` par identifiant distinct, mis en cache                      |
| 9   | Créneaux de la réservation modifiée peut-être indisponibles | 07         | Rendus sélectionnables côté client                                                |
| 10  | Pas de mot de passe oublié                                  | 03         | Aucun lien. Le changement de mot de passe, lui, existe et est ajouté à l'écran 05 |
| 11  | _Nouveau_ : fuseau des créneaux non précisé                 | 02, 07, 10 | Hypothèse heure de Paris                                                          |
| 12  | _Nouveau_ : pas de route de rafraîchissement du jeton       | tous       | Reconnexion après expiration                                                      |
| 13  | _Nouveau_ : pas de liste des lieux                          | 01         | Liste déduite des salles                                                          |

## 8. Risques

| Risque                                                       | Impact                                                      | Parade                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Cache de route d'Astro 7 incompatible avec l'adaptateur Node | Pas d'« ISR »                                               | Essai en début de lot 3, repli sur `Cache-Control`                                                                  |
| `pnpm core:sync` modifie l'API de `core`                     | Casse des `queries`                                         | Toute utilisation de `core` passe par `data/` : un seul endroit à corriger                                          |
| Mock sans état                                               | Les parcours d'écriture ne se vérifient pas de bout en bout | Vérifier la requête envoyée (onglet Réseau) et la réponse ; Prism valide la requête contre le contrat (`400` sinon) |
| Jeton dans le `localStorage`                                 | Exposé en cas de XSS                                        | Jamais de HTML brut venant de l'API                                                                                 |
| Hypothèses du contrat (§ 7)                                  | Comportement différent avec la vraie API                    | Hypothèses isolées dans `data/`, listées ici, à remonter au module Back-end                                         |
