# Journal d'usage de l'IA

L'IA est autorisée pendant le projet, à condition d'être **tracée ici**. Ce journal est un livrable évalué (4 points : régularité, erreurs de l'IA relevées et corrigées, posture critique) et sert de base aux questions de la soutenance sur le code généré.

**Règles**

- Une entrée par usage significatif : génération de code, débogage, explication d'un concept, revue, traduction d'un composant… Pas besoin de tracer chaque complétion automatique d'une ligne.
- Rédigez l'entrée **au moment** où vous utilisez l'IA, pas en fin de module.
- Soyez honnête sur ce qui a été accepté tel quel : c'est la vérification et la critique qui sont évaluées, pas le fait de ne pas utiliser l'IA.
- Ajoutez les nouvelles entrées **en haut** de la section _Entrées_.

Apprenant : …
Framework / méta-framework : …

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

### 2026-10-07 — Garde de route pour l'espace gestionnaire (séance 3) — _exemple, à supprimer_

- **Outil** : Copilot Chat dans VS Code
- **Objectif** : rediriger vers « Accès refusé » si l'utilisateur connecté n'est pas `GESTIONNAIRE`.
- **Demande** : « Écris un middleware Nuxt qui protège les pages /manager pour le rôle GESTIONNAIRE », avec le fichier du store de session ouvert.
- **Résultat** : modifié
- **Erreurs de l'IA relevées** :
  - middleware déclaré globalement (`.global.ts`) alors qu'il ne concerne que l'espace gestionnaire ;
  - utilisateur typé `any` au lieu du type `User` de `core` ;
  - pas de cas « non connecté » : redirection vers « Accès refusé » au lieu de `/login?redirect=…`.
- **Vérification** : `pnpm typecheck` ; test manuel avec `client1@salles.example` puis `gestionnaire2@salles.example` ; documentation Nuxt sur les middlewares de route.
- **Ce que j'en retiens** : différence entre middleware global et middleware de page ; toujours vérifier le typage proposé.

---

## Synthèse (à rédiger avant la soutenance)

**Ce que l'IA a bien fait sur ce projet** :

…

**Ses erreurs récurrentes sur mon framework** (API obsolètes, mauvaise version, réactivité, typage…) :

…

**Ce que je ne lui délègue pas, et pourquoi** :

…

**Fiabilité de l'IA sur mon framework** (note de 1 à 5, reportée dans la matrice comparative) : …
