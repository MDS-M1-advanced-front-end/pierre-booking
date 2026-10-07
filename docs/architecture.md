# Architecture du front (`apps/front`)

Document de coordination : il fixe où va chaque chose dans `apps/front`. On part de l'architecture du portfolio (`portfolio/apps/landing`), adaptée à ce projet : données venant de `@room-booking/core`, style Tailwind et tokens Quorum, application en français seulement.

Toute nouvelle convention ou exception se décide ici **avant** d'écrire le code. Les choix techniques (rendu, session, Svelte…) sont détaillés dans [`cadrage.md`](./cadrage.md), et l'ordre de réalisation dans [`plan.md`](./plan.md).

## Principes

1. **Une page compose, elle ne construit pas.** Une page (`src/pages/`) assemble des sections (`src/partials/`) ; elle contient le moins de balisage et de logique possible.
2. **Une section va chercher ses propres données.** Chaque partial appelle les fonctions de `src/data/` dont elle a besoin. La page ne lui passe que le contexte (paramètres de route, utilisateur…).
3. **Un composant est réutilisable et ne connaît pas l'API.** Il reçoit tout par ses `Props`, typées avec les types de `@room-booking/core`.
4. **Le code métier vit dans `core`.** Types, client HTTP, règles métier et schémas Zod ne sont jamais réécrits dans le front. `packages/core` ne se modifie pas ici : il est écrasé par `pnpm core:sync`.
5. **Pas de valeur de style en dur.** Couleurs, espacements, rayons, ombres et tailles de texte passent par les tokens Quorum (voir [Style](#style)).

## Arborescence

```text
apps/front/
├── .env.example                variables d'environnement (copier en .env)
├── e2e/                        tests de bout en bout Playwright (<parcours>.spec.ts)
├── playwright.config.ts
├── public/                     fichiers servis tels quels (favicon…)
└── src/
    ├── pages/                  routes Astro : composition uniquement
    │   └── index.astro         écran 01 Catalogue
    ├── layouts/
    │   └── Layout.astro        <html>, <Head>, en-tête et pied de page communs
    ├── partials/               sections propres à une page
    │   └── <page>/             ex. catalogue/RoomList.astro, catalogue/Filters.astro
    ├── components/             composants réutilisables
    │   ├── Head.astro          <head> commun, importe le CSS global
    │   ├── RoomCard.svelte     composants d'interface en Svelte (statiques ou îlots)
    │   └── <Composant>.ts      script client éventuel, à côté de son composant
    ├── data/                   accès aux données, un dossier par domaine
    │   └── rooms/
    │       ├── rooms.queries.ts   fonctions async qui appellent core
    │       └── rooms.mock.ts      données fictives pendant la conception
    ├── theme/
    │   ├── global.css          Tailwind + branchement des tokens + styles de base
    │   └── tokens.css          copie telle quelle de maquettes/tokens.css
    └── utils/                  fonctions pures, sans dépendance à Astro (format de prix…)
```

### `pages/`

- Une route = un fichier. Une route dynamique utilise les crochets : `rooms/[id].astro`.
- Contenu : un `<Layout title="…">` qui entoure les partials de la page.
- Pas d'appel à `src/data/` ici, sauf pour lire un paramètre nécessaire à toute la page (ex. `getRoom(id)` pour décider d'une 404).

### `layouts/`

- `Layout.astro` : `<html lang="fr">`, `<Head>` (titre de l'onglet suffixé par « · Quorum »), conteneur principal, puis en-tête et pied de page communs aux 11 écrans.
- Un seul layout tant que tous les écrans partagent la même structure.

### `partials/<page>/`

- Sections d'**une seule** page, rangées dans le dossier de cette page (comme `partials/home/` dans le portfolio).
- Une section peut faire un `await` sur une fonction de `src/data/` dans son frontmatter.
- Une section interactive est un **îlot Svelte** (`<Section>.svelte`) placé au même endroit, et elle appelle `src/data/` depuis le navigateur.
- Si une section sert sur deux pages, elle devient un composant.

### `components/`

- Composants d'interface réutilisables : `RoomCard`, `Icon`, `Badge`, `Button`, `Alert`… (liste de la maquette : `maquettes/composants.html`).
- Ils sont **écrits en Svelte** : Astro les rend en HTML statique quand ils sont utilisés sans directive `client:*`, et les îlots les réutilisent tels quels. Une seule implémentation par composant. Restent en Astro : `Head`, le layout et ce qui ne sert qu'au serveur.
- Les `Props` sont déclarées avec `interface Props`, **sans `export`** : Astro n'en a pas besoin. On n'exporte que si un autre fichier importe le type. Elles utilisent les types de `@room-booking/core` (`Room`, `Reservation`…), jamais un type recopié.
- Pas d'appel réseau dans un composant.
- **Script client** : pour une petite interaction, il va dans `<Composant>.ts` à côté du `.astro`, et le composant l'importe avec `<script>import './<Composant>'</script>` (modèle : `Background` dans le portfolio).
- **Écrans en CSR** (espace connecté) : îlots Svelte (`@astrojs/svelte`), en `client:only="svelte"` dès qu'ils lisent la session.

### `data/<domaine>/`

Un dossier par domaine de l'API : `rooms`, `reservations`, `auth`, `users`. Fichiers nommés `<domaine>.<rôle>.ts` :

| Fichier                | Rôle                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<domaine>.queries.ts` | Fonctions `async` appelées par les partials. Elles enveloppent les fonctions de `core` (`searchRooms`, `getRoom`…) et décident quoi faire d'un `Result` en erreur. |
| `<domaine>.mock.ts`    | Données fictives typées avec les types de `core`, utilisées par `queries` tant que l'API n'est pas branchée. Commentaire en tête : donnée temporaire.              |

État partagé du navigateur (session) : `data/auth/session.svelte.ts`.

Pas de schémas de validation dans le front : les fonctions de `core` sont utilisées telles quelles, et les schémas Zod viendront de `core`. En attendant, les formulaires s'appuient sur les contraintes HTML (voir `cadrage.md` § 2.6).

Les partials passent toujours par `queries`, jamais directement par `mock` ni par `core`. Passer du mock à l'API ne touche donc qu'un fichier.

### `theme/`

- `tokens.css` : copie de `maquettes/tokens.css`, **jamais modifiée à la main**. Si la maquette change, on recopie le fichier.
- `global.css` : `@import "tailwindcss"`, import des tokens, bloc `@theme inline` qui branche les tokens sur Tailwind, styles de base (`body`, titres).
- Importé une seule fois, par `components/Head.astro` (comme dans le portfolio), lui-même utilisé par `layouts/Layout.astro`.

### `utils/`

Fonctions pures et testables, sans import d'Astro : formatage (prix, dates en heure de Paris), construction d'URL… Un fichier par fonction ou par thème, nommé en camelCase (`formatPrice.ts`).

## Configuration

- `API_BASE_URL` : URL de l'API, lue par le client HTTP de `core` dans `process.env`.
  - Valeur par défaut, définie dans `astro.config.mjs` : `http://localhost:4010`, le mock Prism (`pnpm mock` ou `docker compose up mock`). Le mock sert les routes **sans** préfixe `/api` (`/rooms` répond, `/api/rooms` renvoie 404).
  - Pour viser une autre API : copier `.env.example` en `.env` (ignoré par git) ou définir la variable dans le shell, qui a la priorité.
  - Astro ne place pas le `.env` dans `process.env` : `astro.config.mjs` le charge avec `process.loadEnvFile()` (Node ≥ 20.12).

## Style

Écart volontaire avec le portfolio : pas de fichier `.css` par composant, mais des **classes Tailwind** dans le balisage, branchées sur les tokens Quorum.

- Les palettes par défaut de Tailwind sont retirées : `bg-gray-100` ne fonctionne pas. On utilise les noms des tokens sémantiques : `bg-surface`, `text-text-muted`, `border-border`, `rounded-lg`, `shadow-sm`, `text-sm`, `font-bold`.
- Espacements : le token directement, avec la syntaxe Tailwind 4 `p-(--space-4)`, `gap-(--space-2)`.
- La palette brute (`--palette-*`) ne s'utilise pas dans les composants, sauf si la maquette le fait elle-même (ex. le dégradé de l'image de remplacement).
- Points de rupture de la maquette : `md:` = `48rem`, `lg:` = `64rem` (ce sont aussi ceux de Tailwind).
- **Point fragile** : `@theme inline` fait générer à Tailwind des variables qui pointent vers elles-mêmes (`--color-action: var(--color-action)`), dans `@layer theme`. Ça ne marche que parce que `tokens.css` est importé **hors couche CSS** et l'emporte. Ne pas le déplacer dans un `@layer`.

## Accessibilité

On reprend les règles du README de la maquette (WCAG 2.2 AA) : focus visible, cibles de 44 px, statuts qui ne reposent pas sur la seule couleur, `aria-describedby` et `aria-invalid` sur les erreurs de formulaire, `role="status"` / `role="alert"`, `<dialog>` natif pour les modales, `prefers-reduced-motion`.

## Conventions de code

- **Nommage** : composants et partials en PascalCase (`RoomCard.svelte`, `RoomList.astro`), utilitaires en camelCase (`formatPrice.ts`), données en `<domaine>.<rôle>.ts`.
- **Format** : Prettier du dépôt (`singleQuote`, `printWidth: 100`, points-virgules). Attention : le portfolio est sans points-virgules, ce projet en met.
- **Langue** : code (noms de variables, fonctions) en anglais ; textes affichés, commentaires et commits en français.
- **Commits** : gitmoji, en français, un commit par étape logique (`:sparkles:`, `:lipstick:`, `:heavy_plus_sign:`, `:memo:`…). Pas de mention de Claude.
- **Tests** : un test unitaire Vitest à côté du fichier testé (`formatPrice.test.ts` à côté de `formatPrice.ts`), lancé par le `vitest.config.ts` de la racine, qui regroupe tous les paquets en **projets nommés** : `core`, `front:utils`, `front:data`, `front:components` (`pnpm test`, ou `pnpm test --project front:utils`). Un dossier de `src/` qui reçoit des tests = un projet `front:<dossier>`. Tests de bout en bout Playwright dans `apps/front/e2e/` (`pnpm test:e2e`).
- **Vérification** avant commit : `pnpm typecheck` (`astro check`) **et** `pnpm build` dans `apps/front`. `astro check` ne voit pas un import CSS cassé.
- **Journal IA** : chaque usage de l'IA est tracé dans `docs/ai-journal.md`.

## Points ouverts

Les points ouverts (rendu, session, `process.env` dans le navigateur, Docker…) sont tranchés ou listés dans [`cadrage.md`](./cadrage.md) et [`plan.md`](./plan.md) (« À trancher avant de coder »).
