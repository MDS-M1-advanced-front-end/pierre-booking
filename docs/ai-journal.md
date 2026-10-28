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

### 2026-10-28 — JSDoc du back et question sur la machine à états des réservations (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal, avec 3 sous-agents en parallèle (un par module) ; `common/` fait par l'agent principal.
- **Objectif** : documenter le back en JSDoc, et répondre à une question sur les transitions de statut des réservations.
- **Demande** : « Premier point, tu n'as fait aucune JSDoc. Deuxième point, c'est une question uniquement : il n'y a pas de machine à états dans la réservation ? Aucune condition de transition ? »
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - JSDoc en français, au style du client de `core` (`@param nom - …`, `@returns`, `@throws {Exception} condition`) sur les classes, interfaces et fonctions exportées et les méthodes publiques de `common/` et des trois modules (99 fichiers) ; les commentaires `//` au-dessus des déclarations sont devenus la première phrase de leur JSDoc ; pas de JSDoc sur les propriétés de DTO ni les colonnes TypeORM ;
  - commit `2fb5f37`, poussé sur la PR #19 ;
  - un commentaire devenu faux corrigé au passage : `AuthUser` n'est plus « le contenu du JWT » (le jeton ne porte que l'identifiant, le rôle est relu en base).
- **Réponse à la question** : pas de machine à états explicite. Les conditions existent mais sont dispersées : `confirm` et `reject` exigent `PENDING`, `cancel` exige un statut actif, mais `reschedule` ne contrôle rien lui-même (c'est le cas d'usage qui appelle `assertActive`), `status` est modifiable de l'extérieur, aucune condition de temps (confirmer une demande passée, annuler une réservation terminée), et `COMPLETED` n'est jamais atteint (#9). Proposition faite, pas codée : table de transitions dans le domaine, une méthode `transitionTo` unique, `status` en lecture seule.
- **Erreurs de l'IA relevées** : la JSDoc n'avait été faite sur aucun fichier du back avant ma remarque, alors que le client de `core` en a partout.
- **Vérification** : diff filtré pour ne garder que les lignes hors commentaires : **aucune** (seuls des commentaires ont changé) ; `pnpm check`, typecheck et lint du back ; relecture de passages (`Reservation`, cas d'usage de connexion) pour écarter les JSDoc creuses.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-28 — Clean architecture : modules users et reservations (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : terminer la migration du back en clean architecture, avec trois modules (`rooms`, `users`, `reservations`) auxquels le reste se rattache.
- **Demande** : « Fais un premier commit, puis fais les modules user et reservation. Ce sont nos trois modules et le reste des éléments peuvent normalement s'y greffer. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** (commit `581677d` pour le module rooms, avant ce travail) :
  - **`users`** : utilisateurs et authentification. Domaine `User` (normalisation de l'e-mail, profil, rôle), exceptions, repository ; ports `PasswordHasherPort` (scrypt) et `TokenPort` (JWT) ; 8 cas d'usage (inscription, connexion, authentification d'un jeton, lecture, liste, modification, mot de passe, suppression) ; guard global et décorateurs (`@Public`, `@Roles`, `@CurrentUser`) dans `infrastructure/auth`, utilisés par tous les modules ;
  - **`reservations`** : réservations, paiements et administration. Domaine `Reservation` (cycle de vie, créneau, capacité, montant), `Payment` ; ports `RoomBookingPort` (vers rooms), `PaymentGatewayPort` (paiement simulé), `StatisticsPort` ; 11 cas d'usage ;
  - **`rooms`** : récupère les disponibilités (entité `AvailabilitySlot` avec les règles de chevauchement et de couverture, 2 cas d'usage, `RoomAvailabilityService`) et expose `RoomBookingService` au module reservations ;
  - **dépendances entre modules** : reservations → rooms par un port ; rooms lit l'occupation directement dans la table des réservations (adaptateur TypeORM en lecture seule), pour éviter une dépendance circulaire entre modules Nest ;
  - entités TypeORM déplacées dans l'infrastructure de chaque module (`git mv`, historique conservé) ; `features/` et `models/` supprimés ;
  - nouvelles entités du domaine construites à partir d'un objet de propriétés plutôt que de paramètres positionnels (après l'erreur du mapper des salles).
- **Commit** : `e3e77dd` (un seul : les entités TypeORM des trois modules s'importent entre elles, aucun découpage par module ne compilait seul), puis pull request vers `main`.
- **Choix à valider** : statistiques calculées par une requête de lecture sur trois tables (`TypeormStatisticsQuery`) plutôt qu'à travers les repositories ; guard et décorateurs d'authentification rangés dans le module `users`.
- **Erreurs de l'IA relevées** : `git rm` du dernier fichier de `application/ports` a supprimé le dossier, et l'écriture suivante a échoué (vu dans la sortie, recréé).
- **Vérification** : typecheck, lint, `pnpm check` ; `migration:generate --check` sans écart (mêmes tables) ; démarrage de l'app (injection de dépendances et imports croisés entre entités en ESM) ; scénario d'API étendu aux routes `auth`, `users`, `admin` et `payments`, sur une base neuve : **123 vérifications OK**, aucune erreur serveur (dont un changement de rôle appliqué sans reconnexion et la connexion avec un e-mail en majuscules) ; `pnpm seed` avec les nouvelles entités.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-28 — Clean architecture : cas d'usage des salles (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : poursuivre mon refactor du back en clean architecture (`modules/rooms` : `domain`, `application`, `infrastructure`), sur les salles seulement.
- **Demande** : « J'ai commencé un gros refactor pour transformer le back en clean architecture. Observe les modifications que j'ai faites, puis fais les autres use-cases de rooms seulement pour l'instant. »
- **Résultat** : _à compléter_
- **Ce que l'IA a relevé dans mon travail en cours** (le back ne compilait plus) :
  - `get-rooms.use-case.ts` contenait `CreateRoomUseCase`, avec `@Injectable` sans parenthèses et une virgule après `@Inject(...)` (erreur de syntaxe) ;
  - entité `Room` du domaine avec des relations vers `User`, `Availability`, `Reservation` non importées (et sans équivalent dans le domaine) ; `relations?: RoomRepositoryInterface` au lieu de `RoomRepositoryRelationsParam` ;
  - `TypeOrmRoomEntity` exporté sous ce nom, mais 13 fichiers importaient encore `{ Room }` ; `RoomStatus` importé d'un DTO supprimé ;
  - controller et DTOs : chemins relatifs faux, `roomsService` utilisé sans être injecté, `create` qui renvoyait un objet partiel au lieu du schéma `Room` ;
  - filtre : import de l'objet `response` d'Express au lieu de la réponse de la requête, format différent du schéma `Error` ; `validate()` lançait une `Error` simple (→ 500) ;
  - mapper TypeORM vide ; `app.module` toujours branché sur l'ancien module.
- **Ce qui a été fait** :
  - **domaine** : `Room` sans relations (autres agrégats référencés par identifiant), règles `canBeManagedBy`, `isVisibleTo`, `update` ; exceptions `RoomNotFound`, `InvalidRoom`, `RoomAccessDenied`, `RoomHasReservations` ; interface de repository avec `findPage(criteria)` ;
  - **application** : `CreateRoom` (corrigé, renommé `create-room.use-case.ts`), `GetRooms`, `GetRoom`, `UpdateRoom`, `DeleteRoom` ; port `RoomAvailabilityPort` pour le filtre de disponibilité ;
  - **infrastructure** : mapper ORM ↔ domaine, repository TypeORM (filtres, visibilité, pagination, conflit `409` à la suppression), filtre d'exceptions au format `{ code, message }`, controller sur les cas d'usage, `toRoomDTO` ;
  - **transition** : `features/rooms` ne garde que les disponibilités et la lecture d'une salle pour les réservations (`RoomAvailabilityModule`) ; les routes `/rooms/{id}/availability` y délèguent encore.
- **Erreurs de l'IA relevées** : dans le mapper ORM → domaine, **`pricePerHour` oublié** dans l'appel au constructeur à 11 paramètres positionnels : tous les arguments suivants étaient décalés. Vu à la relecture, avant le typecheck. Ce type de constructeur est fragile.
- **Vérification** : typecheck, lint, `pnpm check` à la racine ; `migration:generate --check` sans écart (le renommage de l'entité ne change pas le schéma) ; scénario d'API réécrit (le dossier temporaire avait été vidé) et rejoué sur une base neuve : **78 vérifications OK**, aucune erreur serveur (création complète, `PATCH` partiel et effacement, visibilité par rôle, pagination, filtres de disponibilité, `403` / `404` / `409`, réservations et paiement sur les nouvelles salles) ; corps d'erreur du filtre de domaine vérifiés.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-28 — Front branché sur le back, Docker de production et `pnpm dev` (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : faire tourner le front sur le vrai back, passer `compose.yaml` en production avec une image par app, et un environnement de développement où seule la base tourne dans Docker.
- **Demande** : « J'ai mergé vers `main`. Brancher le front sur le back, modifier `compose.yaml` pour qu'il devienne celui de prod, utilisant les Dockerfile des apps que tu dois créer, puis faire un compose de dev avec juste la db et modifier le script de dev pour qu'il lance le compose avant de faire un dev sur les apps pnpm. » (interrompu pendant les tests, puis « reprends »)
- **Résultat** : _à compléter_
- **Ce qui a été fait** (branche `feat/docker`) :
  - **front** (#2) : vise le back par défaut (`http://localhost:8080/api`). Problème relevé par l'IA avant de coder : l'URL de l'API était inscrite au build pour le serveur **et** le navigateur ; en Docker, le serveur Astro doit appeler `backend:8080` et le navigateur `localhost:8080`. `define` limité au code client (`vite.environments.client`, Vite 8) avec `PUBLIC_API_BASE_URL` ; le SSR lit `API_BASE_URL` au démarrage. Les e2e restent sur le mock (`env` dans `playwright.config.ts`) ;
  - **production** : `apps/backend/Dockerfile` et `apps/front/Dockerfile` (multi-étapes, contexte à la racine pour l'espace de travail pnpm, `pnpm fetch` pour le cache, `pnpm deploy --prod`, utilisateur non root ; migrations au démarrage du back), `.dockerignore`, `compose.yaml` réécrit (base non exposée, healthchecks, `JWT_SECRET` obligatoire), `.env.example` à la racine ;
  - **développement** : `compose.dev.yaml` (base seule), `scripts/dev-db.js` (lit le port dans `apps/backend/.env`), `pnpm dev` = base → migrations → back et front en parallèle ; `pnpm seed` à la racine ;
  - `Dockerfile` du cours supprimé (plus utilisé) ; README, `AGENTS.md`, `architecture.md` et `cadrage.md` mis à jour ;
  - commits `44a1e21` (front, ferme #2), `5f06b12` (Docker de production), `22464e5` (`pnpm dev`), `4ac9229` (docs), puis pull request vers `main`.
- **Points d'attention** :
  - les services Docker du cours (`node`, `mock`, `dev` : travailler sans Node) disparaissent avec l'ancien `compose.yaml` ;
  - noms de projet compose distincts (`room-booking`, `room-booking-dev`) : sans eux, prod et dev auraient partagé le même volume de base ;
  - `${JWT_SECRET:?}` fait échouer **toute** commande compose de prod sans la variable (même `ps`, `logs`) : d'où le `.env` à la racine ;
  - `pnpm deploy` n'emporte pas `dist/`, ignoré par git : copié à part dans les images ;
  - la base de prod démarre vide : le seed est réservé au développement.
- **Erreurs de l'IA relevées** :
  - **commit mélangé, encore** : le premier commit (front) a embarqué la suppression du `Dockerfile`, déjà indexée par `git rm`. Vu dans le `--stat`, commit défait (`reset --soft`) et refait, la suppression rangée dans le commit Docker ;
  - première modification d'`astro.config.mjs` avec **deux clés `vite`** (la seconde aurait écrasé le plugin Tailwind), vue à la relecture avant le build ;
  - les e2e lancés juste après `pnpm dev` auraient réutilisé le serveur du port 4321, branché sur le back : serveur arrêté avant les e2e, consigne ajoutée dans `AGENTS.md` ;
  - **e2e bloqués près de 30 minutes sans que l'IA le voie** : c'est moi qui ai demandé s'il y avait une boucle. L'IA attendait la notification de fin au lieu de regarder le journal du test, où l'erreur était visible dès la première minute (`Process from config.webServer exited early`). Cause : Astro 7.4.2 (arrivé dans le lockfile avec le commit `584797d`, la création du back) détecte un agent IA (`CLAUDECODE`, `AI_AGENT`) et lance `astro dev` en arrière-plan ; Playwright croit à un plantage et attend indéfiniment. Sans effet dans mon terminal ni en CI. Vérifié en relançant `astro dev` sans `CLAUDECODE` (reste au premier plan) ; e2e relancés sans ces variables, consigne ajoutée dans `AGENTS.md`.
- **Vérification** :
  - build du front avec deux URL différentes : seule l'URL publique dans `dist/client`, le serveur lit la variable au démarrage ;
  - prod : `docker compose up -d --build`, 3 conteneurs sains, migration au démarrage, SSR de l'accueil servi via `backend:8080`, puis **connexion dans un vrai navigateur** (Chromium piloté par Playwright) : `POST /api/auth/login` et `GET /api/reservations` en 200, aucune erreur CORS ; pile arrêtée et volume supprimé ensuite ;
  - dev : `pnpm dev` (base sur 5433, migration, back et front), `pnpm seed`, connexion dans le navigateur avec `client1` (réservations et noms de salles) et `gestionnaire1` (demandes en attente) sans erreur ;
  - `pnpm check` ; e2e Playwright sur le mock : **81 sur 84**. Les 3 échecs (`modifier-reservation.spec.ts`) ne viennent pas de la branche : le test modifie la réservation du 12 octobre 2026 du jeu de données, désormais passée, et la page refuse de modifier une réservation passée. Preuve : avec l'horloge du navigateur figée au 5 octobre (`page.clock.install`, modification temporaire annulée ensuite), les 4 tests du fichier passent. Les tests dépendent de la date du jour : à corriger côté front.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — CORS (#7) et pull request de la branche `back` (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : lever le dernier point qui empêche le front d'appeler le back depuis le navigateur, puis proposer la branche `back` à la fusion.
- **Demande** : « Attaque le 7 maintenant. Ensuite, committe et ouvre la PR vers `main`. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** : `app.enableCors` dans `main.ts`, origines lues dans `CORS_ORIGIN` (défaut `http://localhost:4321`, plusieurs origines séparées par des virgules) ; en-têtes du prévol autorisés tels que demandés (`Authorization`, et `Prefer` envoyé par `mockPersona`) ; `CORS_ORIGIN` ajouté au `.env.example`. Pull request de `back` vers `main`.
- **Erreurs de l'IA relevées** : PR ouverte après les seules vérifications du back, sans lancer les étapes de la CI à la racine (`pnpm typecheck`, `lint`, `format:check`, `test`). `format:check` échouait sur `docs/use-cases.md` (ligne vide manquante et espaces en fin de ligne, déjà présents dans le commit `a899ec9`). Repéré pendant que la CI tournait ; mise en forme corrigée par Prettier et poussée sur la PR.
- **Vérification** : typecheck et lint ; requêtes `curl` sur l'app lancée : prévol `OPTIONS` depuis `localhost:4321` → `204` avec `Access-Control-Allow-Origin` et les en-têtes demandés ; `GET` depuis le front → en-tête présent ; origine inconnue → pas d'en-tête (le navigateur bloque). Pas encore testé depuis le vrai front dans un navigateur (ticket #2).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Tickets back #11, #12, #13, #14 et #16 (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : corriger cinq des tickets back ouverts juste avant.
- **Demande** : « Commit, puis attaque les points 11, 12, 13, 14, 16. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - **#11** : filtre d'exception global (`common/api-errors.ts`) : toutes les erreurs au format `{ code, message, details }` du schéma `Error`, avec les erreurs de validation par champ dans `details` (chemin des champs imbriqués : `slots.0.startTime`) ; une erreur inattendue donne `INTERNAL_ERROR` sans fuite de détail, et elle est journalisée ;
  - **#12** : `description` et `imageUrl` acceptent `null` dans `PATCH /rooms` pour effacer la valeur ; `nullable: true` ajouté au contrat, `core` régénéré ;
  - **#13** : `NonEmptyBodyPipe` (`minProperties: 1`) sur les `PATCH` de salle, de réservation et de profil ; `@IsUrl({ require_tld: false })` pour les URL `localhost` ; décorateur `IsOptionalNotNull` pour les champs `NOT NULL` ;
  - **#14** : préfixe `/api` et port 8080, comme le serveur du contrat (et la valeur par défaut de `core`) ;
  - **#16** : le back refuse de démarrer en production sans `JWT_SECRET` ; le guard relit l'utilisateur en base à chaque appel (rôle à jour, compte supprimé refusé) ; `GET /` public ;
  - commits : `dc33bc2` (contrat), `b07e412` (#11), `33d0493` (#12, #13), `9d8ac45` (#14), `db9d41d` (#16). `main.ts` et `.env.example` touchaient plusieurs tickets : versions intermédiaires stagées pour séparer les commits, chacun vérifié seul au typecheck. Les tickets se fermeront à la fusion dans `main` (`Closes #…`). Ticket front #2 mis à jour avec la nouvelle URL.
- **Erreurs de l'IA relevées** :
  - **ticket #12 inexact** : l'IA y affirmait que `null` était refusé. Vérification faite avant de coder, c'était faux : `@IsOptional()` laisse passer `null`, et le back effaçait déjà la photo. Il ne manquait que le contrat ;
  - ce même essai a révélé un **bug que l'IA avait introduit** dans ses DTOs : `null` sur un champ obligatoire (`{"name": null}`, `{"firstName": null}`) passait la validation et finissait en **500** (contrainte `NOT NULL` en base). Corrigé avec `IsOptionalNotNull` ;
  - le script de test de l'IA supposait une réponse JSON partout : en dehors de `/api`, Nest 12 laisse Express répondre avec une page HTML (404). Comportement gardé (seul `/api` est l'API) ; le test de 404 lui-même ne changeait pas l'identifiant de la salle, refait à la main.
- **Limite** : le message de `ParseUUIDPipe` reste en anglais (`Validation failed (uuid is expected)`), avec le bon `code`. Le front n'affiche jamais le message brut.
- **Vérification** : typecheck, lint, test unitaire, `pnpm check` de `core` ; scénario complet (74/74) sur une base de test séparée (`resa_test`, pour ne pas toucher aux données du seed) ; tests ciblés par ticket sur la base du seed (corps d'erreur, `400` sur les `PATCH` vides et les `null`, effacement de la photo, admin rétrogradé refusé sans se reconnecter : `200` puis `403`) ; démarrage refusé avec `NODE_ENV=production` sans secret ; seed relancé après les essais.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Tickets pour les problèmes du back (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : tracer en tickets les problèmes du back relevés pendant la séance, comme ceux du front (#2 à #6).
- **Demande** : « J'aimerais retourner sur les problèmes que je t'ai fait chercher plus tôt. Ajoute aussi des issues pour les problèmes back que tu as relevés. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** : label `back` et 10 tickets (#7 à #16), avec `bug`, `enhancement` ou `question` en plus : CORS non activé (#7), noms des demandeurs refusés au gestionnaire (#8), passage automatique en `COMPLETED` (#9), réservations simultanées et contrainte d'exclusion (#10), format des erreurs non conforme au schéma `Error` (#11), `imageUrl` impossible à effacer (#12), écarts de validation (`PATCH` vide accepté, URL `localhost` refusée) (#13), préfixe `/api` et port 8080 du contrat (#14), notifications non branchées (#15), sécurité (secret JWT par défaut, rôle figé dans le jeton, `GET /` protégé) (#16). Les tickets liés au front y renvoient (#2, #4, #6).
- **Erreurs de l'IA relevées** : première création des tickets lancée depuis un dossier temporaire, hors du dépôt : `gh` a échoué (le label, lui, était créé). Relancée avec `-R` sur le dépôt.
- **Vérification** : liste des tickets relue sur GitHub ; les points #13 (`PATCH` vide accepté) et #10 (concurrence) viennent de la lecture du code, ils n'ont pas été reproduits par un appel.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Journal reconstitué et consigne permanente `AGENTS.md` (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : rattraper le journal de la séance, puis faire en sorte que l'IA le tienne sans qu'on le lui rappelle.
- **Demande** : « Tu as complètement oublié de mettre à jour le journal, t'aurais moyen de remettre tout ce qu'on a fait aujourd'hui ? » ; puis séparer l'entrée DTOs / controllers en deux ; puis « souviens-toi de remplir ça à chaque prompt. Normalement tu l'avais stocké en mémoire mais c'est pas resté, donc il faut peut-être le mettre dans un `AGENTS.md` ».
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - 8 entrées du 2026-10-27 reconstituées à partir de la conversation (`cdd1f16`) ;
  - **cause de la perte** : la mémoire de Claude Code est rangée par chemin de projet. Le dépôt est passé de `pierre-booking/` à `pierre-booking/main/`, et la mémoire de l'ancien chemin ne suit pas (elle était d'ailleurs vide) ;
  - `AGENTS.md` à la racine (consigne du journal, conventions de commit, points d'attention du dépôt), importé par `CLAUDE.md`, que Claude Code charge automatiquement ; consigne aussi enregistrée dans la mémoire du nouveau chemin.
- **Erreurs de l'IA relevées** : le journal non tenu pendant toute la séance (voir l'entrée `PATCH /auth/me`).
- **Vérification** : Prettier sur le journal ; relecture des entrées contre l'historique `git log`.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Route `PATCH /auth/me` : modification du profil (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal, sans sous-agent.
- **Objectif** : permettre à un utilisateur de modifier son propre profil sans ouvrir `/users/{userId}` (réservé aux administrateurs).
- **Demande** : à la question de l'IA (ouvrir `/users/{userId}` à l'utilisateur lui-même ?), j'ai répondu que c'était plutôt la route à revoir, puisque le profil se lit déjà par `GET /auth/me`. Puis : « vas-y pour `PATCH /auth/me` ».
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - contrat `packages/core/openapi.yml` : `PATCH /auth/me` avec le schéma `ProfileUpdateRequest` (`firstName`, `lastName`, `email`, sans `role`) ; schéma de `core` régénéré (`pnpm generate:api`), type et fonction `updateMe` ajoutés ;
  - back : `UpdateProfileDTO`, `AuthService.updateMe`, route dans `AuthController` ; route ajoutée dans `docs/use-cases.md` ;
  - ticket front #3 renommé et complété avec les tâches (appeler `updateMe`, gérer le `409`).
- **Point d'attention signalé par l'IA** : `packages/core` est recopié depuis ma branche du dépôt `core` par `pnpm core:sync`. Si je ne reporte pas ces changements sur ce dépôt, le prochain `core:sync` les écrasera.
- **Vérification** : `pnpm check` de `core` ; typecheck et lint du back ; appels réels sur la base du seed avec `client1` : `200` (rôle inchangé), `400` si `role` est envoyé ou e-mail invalide, `409` avec l'e-mail d'un autre compte, `401` sans jeton.
- **Erreur de l'IA relevée** : **le journal n'a pas été tenu pendant la séance**. Toutes les entrées du 2026-10-27 ont été écrites après coup, à ma demande, en reprenant la conversation.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Analyse front/back, seed et tickets front (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : lister ce qui empêche de brancher le front sur le back, puis remplir la base de données.
- **Demande** : « Analyse l'avancement du projet et liste les points manquants entre le front et le back qui empêcheraient de les connecter. » Puis mes décisions sur les points relevés : CORS laissé pour plus tard, route du profil à revoir, réservations du gestionnaire à corriger, et « fais un script de seed, lance le Postgres via compose et applique-le ; ouvre des tickets avec un label `front` pour tout ce qui concerne le front ».
- **Résultat** : _à compléter_
- **Points bloquants trouvés** (en lisant `data/` du front, le client de `core` et les anomalies de `cadrage.md`) :
  - **CORS non activé** : les îlots Svelte, qui appellent l'API depuis le navigateur, seraient bloqués ;
  - **profil** : l'écran 05 appelle `PATCH /users/{id}`, réservé aux administrateurs côté back (→ entrée `PATCH /auth/me`) ;
  - **écran Demandes** : le front suppose que `GET /reservations` renvoie au gestionnaire les réservations de ses salles (anomalie 4), le back suivait la spec à la lettre. Corrigé côté back (`7bbeed6`) ;
  - **base vide**, et impossible de créer un gestionnaire ou un admin par l'API.
- **Ce qui a été fait** :
  - `pnpm seed` (`947df44`) : vide les tables puis reprend `mock/data/*.json` (mêmes ids, mêmes comptes `client1@salles.example`…, mot de passe `motdepasse`), avec des créneaux de 08:00 à 19:00 sur 60 jours ; refusé si `NODE_ENV=production` ;
  - chargement d'un `.env` dans le back (`src/env.ts`, comme `process.loadEnvFile()` dans le front) : le port 5432 de ma machine est pris par un autre projet (`trading-postgres`), la base du compose tourne donc sur 5433 ;
  - label `front` et tickets #2 à #6 : brancher le front sur le back, route du profil, anomalie 4 confirmée, nom manquant d'une salle devenue inactive, photo de salle impossible à retirer.
- **Vérification** : migrations et seed appliqués sur la base du compose ; seed relancé (rejouable) ; connexion par l'API avec un compte de chaque rôle (`gestionnaire1` ne voit que les réservations de ses salles, `client1` que les siennes, statistiques admin cohérentes).
- **Erreurs de l'IA relevées** :
  - lors des services, l'IA avait vu le problème de l'anomalie 4 mais choisi de suivre la spec, en le signalant seulement : il a fallu revenir dessus ;
  - aucune autre trouvée sur cette partie.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Filtre de disponibilité des salles réécrit avec l'ORM (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : remplacer le SQL brut de `whereAvailable` (filtre `date` / `startTime` / `endTime` de `GET /rooms`).
- **Demande** : « Je ne suis pas fan de la manière dont tu l'as fait. Il n'y aurait pas une autre solution en passant par l'ORM plutôt qu'en écrivant du SQL ? »
- **Résultat** : _à compléter_
- **Ce qui a été fait** (`b69ad88`) : deux `find` TypeORM (créneaux ouverts qui couvrent la plage avec `LessThanOrEqual` / `MoreThanOrEqual`, puis réservations actives de la journée avec `In` / `LessThan` / `MoreThan`), chevauchement calculé en TypeScript par la même fonction que `GET /rooms/{id}/availability`. La requête principale ne garde que les ids libres (`andWhereInIds`) : la pagination reste faite par la base. `AvailabilityService` ne dépend plus de `RoomsService`, pour éviter une dépendance circulaire.
- **Compromis** : 3 requêtes au lieu d'une ; les autres filtres (`ILIKE`, capacité, visibilité) restent en query builder.
- **Erreurs de l'IA relevées** : dans le scénario de test, une **attente fausse de l'IA** (1 salle libre alors que la réservation empiétait sur les deux créneaux ouverts) : le code était juste, le test non.
- **Vérification** : scénario relancé sur une base migrée, avec 6 cas de filtre en plus (avant et après déplacement d'une réservation).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Migrations TypeORM et PostgreSQL dans le compose (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : générer les migrations et ajouter la base au `compose.yaml`.
- **Demande** : « J'ai grillé les étapes. Génère-moi les migrations (de mémoire il y a une commande TypeORM pour ça), puis ajoute au compose une image Postgres alpine (ou le plus léger possible). »
- **Résultat** : _à compléter_
- **Ce qui a été fait** (`be688e9`) :
  - `src/database/data-source.ts`, partagé entre l'application et la CLI TypeORM ; scripts `migration:generate`, `migration:run`, `migration:revert`. `ts-node` n'étant pas installé, la CLI tourne sur le code compilé (`nest build` avant) ; les migrations générées restent en TypeScript dans `src/` ;
  - service `db` en `postgres:17-alpine` (volume, healthcheck, port réglable par `DB_PORT`).
- **Erreurs de l'IA relevées** (trouvées en relisant la migration générée, avant de la garder) :
  - les ids utilisaient `uuid_generate_v4()`, qui demande l'extension `uuid-ossp`, que la migration ne crée pas : elle aurait échoué sur une base neuve. L'IA ne l'avait pas vu aux tests précédents, parce qu'elle avait créé le schéma avec `synchronize`, qui installe l'extension. Corrigé avec `uuidExtension: 'pgcrypto'` (`gen_random_uuid()`, natif depuis PostgreSQL 13) ;
  - **double contrainte unique** sur `payments.reservation_id` : la relation `OneToOne` en pose déjà une, l'IA en avait ajouté une seconde dans le model.
- **Vérification** : `migration:run`, `migration:generate --check` (« No changes in database schema »), `migration:revert` puis `run` ; scénario API complet sur la base migrée (68/68).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Services, authentification JWT et règles métier (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : écrire les services et les brancher sur les controllers.
- **Demande** : « Fais les services et branche-les sur les controllers. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** (`93c42bb`) :
  - un module Nest par feature (service, mapper entité → DTO, `forFeature`) ;
  - authentification ajoutée par l'IA, parce que les services en ont besoin (propriétaire d'une salle, auteur d'une réservation) : `@nestjs/jwt`, mots de passe hachés avec `scrypt` de Node, guard global avec `@Public()` (les routes `security: []` du contrat) et `@Roles()` ;
  - règles du contrat : créneau dans le futur et couvert par des disponibilités, chevauchement → `409`, capacité, montant figé, retour à `PENDING` si le créneau d'une réservation confirmée change, `409` sur les changements de statut interdits, `ON DELETE RESTRICT` traduit en `409` ;
  - heure de Paris pour les créneaux et UTC pour les réservations (`common/paris-time.ts`), comme l'hypothèse du cadrage front ; paiement simulé (`PAID` immédiatement).
- **Erreurs de l'IA relevées** :
  - **erreur 500 sur `GET /admin/reservations`** sans filtre, trouvée par le scénario de test : TypeORM 1.x refuse les valeurs `undefined` dans un `where`. Le même bug existait sur `GET /users` sans `role`, non vu car le test passait toujours le rôle. Corrigé aux deux endroits ;
  - deux `spread` d'instances de DTO signalés par le lint, corrigés ;
  - `GET /` (le hello world de Nest) exige maintenant une connexion, effet de bord du guard global, signalé et laissé tel quel.
- **Vérification** : base PostgreSQL jetable dans un conteneur (sans toucher à `trading-postgres`) ; scénario de 66 puis 68 appels couvrant toutes les routes et les 4 rôles (statuts attendus, montants, droits, `passwordHash` jamais renvoyé) ; typecheck, lint, Prettier, test unitaire existant.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Schéma de base de données et models TypeORM (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : vérifier mon schéma de base de données contre les routes de l'API, puis écrire les models.
- **Demande** : « J'ai fait le premier model `rooms.model.ts` et mis le schéma dans `docs/Database.md`. Analyse-le, réécris-le proprement et dis-moi s'il est en accord avec les routes. Ensuite, fais les autres models. »
- **Résultat** : _à compléter_
- **Écarts trouvés dans mon schéma** (`5d707e8`) : des champs requis par le contrat manquaient : `first_name` / `last_name` (users), `location` / `status` (rooms), `date` / `is_available` (availabilities), `total_amount` et les champs optionnels (reservations), `currency` / `payment_method` (payments). `Database.md` réécrit (MCD, MLD, une table par entité, liste des écarts corrigés).
- **Erreurs dans mon `rooms.model.ts`**, relevées par l'IA : imports manquants (le fichier ne compilait pas), `Availability.room` au lieu de `availability.room` dans les relations inverses, `precision` / `scale` en chaînes.
- **Choix de l'IA à valider** : `ON DELETE RESTRICT` sur les réservations (pour le `409` de `DELETE /rooms`), mon `CASCADE` sur le propriétaire gardé ; `Relation<>` sur les relations (sinon les imports croisés entre entités plantent en ESM) ; transformer pour les `decimal`, que `pg` renvoie en chaîne.
- **Vérification** : typecheck et lint ; métadonnées TypeORM construites pour les 5 entités (relations, noms de colonnes, `RESTRICT`). Pas de test contre une vraie base à ce moment-là.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — Controllers de toutes les routes (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : écrire les controllers NestJS de toutes les routes de `openapi.yml`, qui valident les entrées avec les DTOs.
- **Demande** : « Fais-moi tous les controllers qui utilisent ces DTOs pour la vérification. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** (`049a28c`) : 6 controllers (réponse `501` en attendant les services), `@Body()` et `@Query()` typés par les DTOs, `ParseUUIDPipe` sur les ids, codes HTTP du contrat (`200` pour login, confirm et reject, `204` pour les suppressions), `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) dans `main.ts`.
- **Erreurs de l'IA relevées** :
  - pour arrêter le serveur de test, un `pkill -f` a de nouveau **tué son propre shell** (même erreur qu'au lot 1 du front) ; puis mauvais chemin du build (`dist/src/main.js` au lieu de `dist/main.js`) et attente trop courte du démarrage, avant que les tests passent ;
  - question mal ciblée : à « enchaîne sur les routes », l'IA a proposé un choix entre trois interprétations, que j'ai refusé.
- **Vérification** : typecheck (le lint ne signale que les paramètres inutilisés des stubs) ; appels `curl` sur l'app lancée : `400` sur un query param invalide, un id qui n'est pas un UUID, un e-mail invalide, un créneau à `25:00` dans un tableau imbriqué, un champ inconnu (`property hack should not exist`) ; `501` sur les requêtes valides.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-27 — DTOs de toutes les routes (séance 4)

- **Outil** : Claude Code (Claude Opus 5.5) dans le terminal.
- **Objectif** : écrire les DTOs (`class-validator`) de toutes les routes de `openapi.yml`, sur le modèle de mon premier DTO `rooms.dto.ts`.
- **Demande** : « Fais-moi tous les DTOs de toutes les routes en respectant l'archi que j'ai commencé à mettre en place. »
- **Résultat** : _à compléter_
- **Ce qui a été fait** (`0041b9b`) : un `<feature>.dto.ts` par feature (auth, users, rooms avec les disponibilités, reservations, payments, admin) : DTO de l'entité, de création, de modification, de query et de liste paginée. Pagination commune et formats `date` / `time` du contrat dans `src/common/`. `class-transformer` ajouté : requis par le `ValidationPipe` de Nest, et pour convertir les query params et valider les objets imbriqués.
- **Erreurs dans mon `RoomDTO`**, relevées par l'IA : champs optionnels sans `@IsOptional()` (la validation aurait échoué sur un champ absent), `@IsDataURI()` au lieu d'une date ISO sur `createdAt`, contraintes du contrat absentes (`capacity` entier ≥ 1, `pricePerHour` ≥ 0, `ownerId` en UUID).
- **Point relevé par l'IA** : `@Type(() => Boolean)` convertit la chaîne `"false"` en `true` ; le filtre `available` utilise donc un `@Transform` explicite.
- **Vérification** : typecheck et lint ; test de validation à l'exécution, supprimé ensuite (conversion `"5"` → `5`, `"false"` → `false`, valeurs par défaut de la pagination, erreurs imbriquées sur `slots[0].startTime`).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Implémentation, lot 6 : finitions (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5), sans sous-agent.
- **Objectif** : étapes 6.1 à 6.4 : accessibilité, affichage mobile/desktop, titres, nettoyage et docs.
- **Résultat** : _à compléter_
- **Ce qui a été fait** :
  - **6.1** : audit automatique **axe-core** (dépendance `@axe-core/playwright` ajoutée) sur les 14 pages, en 1280 px et 375 px, règles WCAG 2.2 A/AA : **0 violation sur 28 audits**. Pour m'assurer que ce 0 n'était pas un faux positif, j'ai injecté une image sans `alt` et un bouton sans nom : axe les détecte (`image-alt`, `button-name`), et le contenu était bien chargé au moment de l'audit ;
  - **6.2** : captures de 9 écrans aux deux tailles, relues contre la maquette (la barre de filtres de l'écran 06 défile en mobile, comme la maquette) ;
  - **6.3** : titres d'onglet et descriptions posés par chaque écran ;
  - **6.4** : aucun TODO restant ; `cadrage.md` (cache vérifié, limites du mock), `architecture.md` (exception des pages publiques, règle de `client.ts`, aides e2e) et l'état du plan mis à jour.
- **Non fait** : vérification **manuelle** au clavier et au lecteur d'écran (6.1) : un audit automatique ne la remplace pas. 6.5 (synthèse du journal) : à rédiger par moi.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Implémentation, lots 3 à 5 : les 11 écrans (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5), qui a réparti les écrans entre 7 sous-agents en parallèle (catalogue, salle, auth, reservations, modifier-reservation, gestion-salles, gestion-planning). Consignes communes, fichiers attribués à chacun, contrats écrits pour les composants partagés (SlotPicker, ReservationItem, ErrorSummary, cache des noms de salles), puis relecture, intégration et commits.
- **Objectif** : étapes 3.1 à 5.6 : les 11 écrans et leurs tests de bout en bout.
- **Résultat** : _à compléter_
- **Vérifications** : `pnpm check` (304 tests unitaires), **56 tests de bout en bout** Playwright lancés ensemble, build de production.
  - **Cache de route** testé sur le serveur buildé : `X-Astro-Cache` `MISS` puis `HIT`, même entrée quel que soit l'ordre des paramètres, 404 jamais mises en cache.
  - Les tests vérifient **les requêtes envoyées** (le mock est sans état) : `POST /reservations` en UTC correct pour Paris, `PATCH /users` sans `role`, corps complet de `PATCH /rooms`, créneaux d'une heure dans `PUT …/availability`, etc.
  - **Le piège du focus de la `Modal`** (impossible avec jsdom) est testé dans un vrai navigateur : Échap ferme et rend le focus au bouton.
- **Erreurs relevées (agents ou intégration)** :
  - **boutons secondaires sans bordure** sur toute l'application, relevé par deux agents sur leurs captures : même cause que l'icône du lot 1 (`border-transparent` l'emportait selon l'ordre de la feuille Tailwind). Corrigé dans `Button` avec un test « une seule couleur de bordure par variante » ;
  - **changement de mot de passe** : un 401 aurait déconnecté l'utilisateur au lieu d'afficher « mot de passe actuel incorrect » (conflit signalé par l'agent auth entre `withSession` et l'écran 05). Corrigé : `changePassword` ne passe plus par `withSession` ;
  - **commit mélangé de ma part** (encore) : `git add pages/gestion` a embarqué la page de l'écran 11 dans le commit de l'écran 10, alors que ses composants n'étaient pas committés (build cassé à ce commit). Vu dans le `--stat`, commit refait avant de continuer ;
  - **fausse alerte de ma part** : le premier essai du cache sur le build montrait des 404 partout. Le serveur de test lancé au lot 1 tournait encore sur le port, avec l'ancien build ;
  - côté agents : `bind:this` sur un composant (renvoie l'instance, pas l'élément), `$props.id()` dans une chaîne de gabarit, espace manquant « 12personnes » vu sur capture, tests e2e trop larges (`getByText('Refusée')` trouvait aussi un titre) : corrigés par eux ;
  - un agent a reformaté (Prettier) un fichier d'un autre agent, et l'a signalé.
- **Limites du mock découvertes** (listées dans `cadrage.md` § 2.4) : filtres et pagination ignorés, heures `HH:MM:SS` exigées, `GET /rooms/{id}` toujours « Salle Voltaire », pas d'exemple pour `GET /reservations/{id}` ni `GET /users/{id}` (« string string » sur l'écran 11).
- **Écarts assumés** : pas de prix estimé (décision 10) ; compteur « Demandes » de l'en-tête non filtré sur les salles du gestionnaire (2 dans l'en-tête, 1 sur l'écran 11 avec le mock) et non rafraîchi après une action ; l'en-tête suit la maquette (« LM Léa Martin », « Se déconnecter » visible).
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Implémentation, lot 2 : données, session, logique (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5), qui a réparti le travail entre 3 sous-agents en parallèle (data, logic, session-header), puis a relu, intégré et committé.
- **Objectif** : étapes 2.1 à 2.7 : accès à l'API, dates et créneaux, session, garde des pages, en-tête selon le rôle, profils de test du mock.
- **Résultat** : _à compléter_
- **Ce qui a été fait** : `data/client.ts` (seul point d'accès aux fonctions de `core`), requêtes par domaine, `errors.ts`, `mockPersona` (dev seulement), `session.svelte.ts`, `RequireAuth`, `SiteHeader` (3 variantes), `utils/dates.ts` (heure de Paris, changements d'heure), `splitIntoHourlySlots`, `slotSelection`, `redirect` (refus des redirections ouvertes).
- **Vérifications remarquables** :
  - le client de `core` (openapi-fetch) **capture `fetch` à sa création** (vérifié dans le code d'openapi-fetch avant de lancer les agents). L'enveloppe du mock doit donc être installée avant le chargement de `core`, d'où `client.ts`, qui importe `mockPersona` en premier. Prouvé par un test d'intégration contre le mock : la connexion avec `gestionnaire1@…` renvoie bien Nadia Benali ;
  - **le mock ignore la pagination** (`?page=2&pageSize=5` renvoie toujours les 15 salles) et refuse `pageSize > 100` (découvert par l'agent data) : les lectures de toutes les pages ont un garde-fou ;
  - tests des dates rejoués avec `TZ=America/New_York` et `TZ=Asia/Tokyo` : le résultat ne dépend pas du fuseau de la machine ;
  - `mockPersona` absent du build de production (recherche dans `dist/`).
- **Erreurs relevées (agents ou intégration)** :
  - plusieurs agents ont supposé `noUncheckedIndexedAccess` activé (`!`, gardes inutiles), et ESLint strict l'a signalé (33 erreurs chez l'un d'eux), corrigé ;
  - `withSession` vidait la session sur un 401 sans rediriger vers la connexion, contrairement au cadrage § 2.3 : corrigé à l'intégration (`expireSession`), tests adaptés ;
  - le projet Vitest `front:data` n'avait pas le plugin Svelte : les runes de `session.svelte.ts` n'étaient pas compilées (un agent avait contourné en remplaçant `$state`). Plugin ajouté ;
  - l'en-tête affiche « LM Léa Martin » et « Se déconnecter » visible, comme la maquette, alors que la consigne donnée à l'agent disait « prénom » et libellé masqué : l'agent a suivi la maquette et l'a signalé.
- **Ce que j'en retiens** : _à compléter_

### 2026-10-07 — Implémentation, lot 1 : interface de base (séance 3)

- **Outil** : Claude Code (Claude Opus 5.5), qui a réparti le travail entre 4 sous-agents en parallèle (ui-base, forms, feedback-nav, layout-card) avec des consignes communes, des fichiers attribués à chacun et des contrats d'API entre eux, puis a relu, intégré et committé.
- **Objectif** : étapes 1.1 à 1.11 : styles de base, Button, champs de formulaire, Badge, Alert, Modal, états vide / chargement / erreur, Pagination, SegmentedNav, DatePager, RoomCard en Svelte, layout, pages 404 et accès refusé.
- **Résultat** : _à compléter_
- **Vérifications** : `svelte-check`, ESLint, 251 tests (`pnpm check` OK), captures d'écran sur le serveur buildé en 1280 px et 375 px, navigation au clavier (anneau de focus visible).
- **Erreurs relevées** :
  - **icône réduite à un point** dans l'image de remplacement de `RoomCard` (et sur les pages 404 / accès refusé), vue **seulement sur les captures**, alors que tous les tests passaient : `size-[1.25em]` (taille par défaut d'`Icon`) était généré après `size-10` dans la feuille de Tailwind et l'emportait. Corrigé (taille par défaut seulement si l'appelant n'en donne pas) et test ajouté ;
  - mélange de `sr-only` et `visually-hidden` entre agents : harmonisé ;
  - commentaire inexact dans `global.css` sur la règle de mouvement réduit, signalé par l'agent lui-même, puis corrigé ;
  - les pages répondaient en 500 sur le serveur de dev : il avait été lancé avant l'ajout de Svelte. Redémarré par l'IA (`astro dev stop` puis `pnpm dev`) ;
  - en arrêtant le serveur de test, un `pkill -f` de l'IA a tué son propre shell : le motif apparaissait dans sa propre ligne de commande.
- **Limites connues** : jsdom n'implémente pas `<dialog>.showModal()` : le piège du focus de la `Modal` reste à tester avec Playwright (écran 06).
- **Ce que j'en retiens** : _à compléter_

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
