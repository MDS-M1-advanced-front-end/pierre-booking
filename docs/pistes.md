# Pistes d'évolution

Fonctionnalités à ajouter ou à améliorer, relevées le 2026-11-16 en comparant le contrat (`packages/core/openapi.yml`, `packages/core/admin.graphql`), les cas d'usage ([`use-cases.md`](./use-cases.md)), le périmètre ([`cadrage.md`](./cadrage.md), [`plan.md`](./plan.md)) et les pages du front. Classées de la plus rentable à la moins rentable.

## Le back est prêt, il manque l'écran

1. **Renouvellement de la session avec `/auth/refresh`** : le front ne l'utilisait pas, l'utilisateur était renvoyé à la connexion au bout d'une heure, même en plein formulaire. Renouveler le jeton juste avant son expiration et sur un `401`. Front seulement. **En cours sur la branche `dev`.**
2. **Écrans administrateur** : les routes existent (`/users`, `/admin/reservations`, `/admin/statistics`, requête GraphQL `dashboard`) mais le back-office était hors périmètre (`cadrage.md` § 1).
   - gestion des utilisateurs : liste, changement de rôle, suppression ;
   - toutes les réservations, avec des filtres ;
   - tableau de bord sur une période, alimenté par la requête GraphQL `dashboard`.
3. **Paiement d'une réservation confirmée** : `POST /payments` existe (avec la reprise d'un paiement échoué), mais « Mes réservations » n'a pas de bouton « Payer ».

## Le back a des trous

4. **Statut COMPLETED jamais atteint** : la machine à états l'annonce (« une fois endAt dépassé »), mais aucune méthode ni tâche planifiée ne l'applique ; les réservations passées restent CONFIRMED. Même chose pour les demandes PENDING dont la date est passée (à expirer). Pistes : `@nestjs/schedule` et une tâche périodique, ou un calcul à la lecture.
5. **Notifications par e-mail** : au demandeur (demande confirmée ou refusée, avec le motif) et au gestionnaire (nouvelle demande). Prévues dans `use-cases.md` (« Service de notification »). Un port `Notifier` avec un adaptateur qui journalise, puis SMTP.
6. **Mot de passe oublié** : jeton à usage unique et deux routes ; dépend du point 5 pour envoyer le lien.

## Améliorations du front

7. **Estimation du prix avant de réserver** : abandonnée faute de route (`cadrage.md` § 2.7), alors que `Reservation.computeAmount` existe côté back. L'exposer, ou faire le calcul dans `core`.
8. **Calendrier par salle pour le gestionnaire** : vue de la semaine avec les réservations, plutôt que la seule liste des demandes. Une requête GraphQL pourrait regrouper salle, disponibilités et réservations.
9. **Restes du plan** : vérification au lecteur d'écran (étape 6.1) jamais faite ; schémas Zod de `core` toujours attendus.

## Déploiement

- `compose.yaml` publie les ports 4321 et 8080 sur l'IP publique : derrière Dokploy, retirer ces `ports:` et laisser le proxy router.
- `PUBLIC_API_BASE_URL` et `FRONT_URL` valent `localhost` par défaut : les fixer aux adresses publiques en HTTPS.
