# Consignes pour les agents IA

## Journal d'usage de l'IA (obligatoire)

`docs/ai-journal.md` est un livrable évalué. **À chaque demande traitée** (génération de code, débogage, analyse, revue…), ajouter ou compléter l'entrée correspondante **avant de rendre la main**, sans attendre qu'on le demande :

- nouvelle entrée **en haut** de la section _Entrées_, au format des entrées existantes : `### AAAA-MM-JJ — Titre court (séance N)`, puis Outil, Objectif, Demande (citation ou résumé du prompt), Résultat, Ce qui a été fait (avec les hash des commits), Erreurs de l'IA relevées, Vérification, Ce que j'en retiens ;
- une demande qui prolonge la précédente (même sujet) complète son entrée au lieu d'en créer une ;
- **Résultat** et **Ce que j'en retiens** restent `_à compléter_` : c'est l'apprenant qui les rédige ;
- être honnête sur les erreurs de l'IA (y compris celles corrigées en cours de route) : c'est ce qui est évalué ;
- le journal est committé avec le travail qu'il décrit, ou dans un commit `:memo: journal IA : …` juste après.

## Commits

- Convention gitmoji, messages en français : `:sparkles: back : …`, `:memo: docs : …`.
- Jamais de mention de Claude ni de `Co-Authored-By` dans les messages.
- Committer seulement quand on le demande ; relire `git diff --cached --stat` avant chaque commit (un fichier embarqué par erreur a déjà cassé le build).

## Dépôt

- `packages/core` est recopié depuis le dépôt `core` par `pnpm core:sync` : toute modification locale (contrat `openapi.yml`, client) doit être reportée sur ce dépôt, sinon elle sera écrasée.
- Back (`apps/backend`) : configuration dans `apps/backend/.env` (voir `.env.example`). Sur la machine de l'apprenant, le port 5432 est pris par un autre projet : la base du compose tourne avec `DB_PORT=5433 docker compose up -d db`.
