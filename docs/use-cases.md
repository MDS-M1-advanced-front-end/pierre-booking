# use cases
![](./references/use-cases.png)

Routes issues de [`packages/core/openapi.yml`](../packages/core/openapi.yml)

## User / client

- Créer un compte
  - `POST /auth/register`
- Se connecter
  - `POST /auth/login`
- Rechercher une salle
  - `GET /rooms` (filtres `search`, `location`, `capacityMin`, `capacityMax`, `date`, `startTime`, `endTime`, `available`)
- Consulter les détails d'une salle
  - `GET /rooms/{roomId}`
- Vérifier les disponibilités
  - `GET /rooms/{roomId}/availability`
- Réserver une salle
  - `POST /reservations`
  - `<<include>>` Vérifier les disponibilités : faite côté serveur par `POST /reservations` (409 si créneau indisponible)
  - `<<include>>` Payer la réservation → Système de paiement (externe)
    - `POST /payments`
    - `GET /payments/{paymentId}`
  - `<<include>>` Envoyer confirmation (de réservation) → Service de notification (externe)
    - pas de route : effet de bord de `POST /reservations/{reservationId}/confirm`
- Consulter ses réservations
  - `GET /reservations`
  - `GET /reservations/{reservationId}`
- Modifier une réservation
  - `PATCH /reservations/{reservationId}`
  - `<<include>>` Consulter ses réservations
- Annuler une réservation
  - `DELETE /reservations/{reservationId}` (passage au statut `CANCELLED`)
  - `<<include>>` Modifier une réservation
  - `<<include>>` Envoyer notification (annulation) → Service de notification (externe)
    - pas de route : effet de bord de `DELETE /reservations/{reservationId}`

## owner / room manager

- Ajouter une salle
  - `POST /rooms`
- Modifier une salle
  - `PATCH /rooms/{roomId}`
- Supprimer une salle
  - `DELETE /rooms/{roomId}`
- Gérer les disponibilités
  - `GET /rooms/{roomId}/availability`
  - `PUT /rooms/{roomId}/availability`
- Confirmer / Refuser une réservation
  - `GET /reservations` : liste des demandes, sous hypothèse (anomalie 4)
  - `POST /reservations/{reservationId}/confirm`
  - `POST /reservations/{reservationId}/reject`

## admin

- Gérer les utilisateurs
  - `GET /users`
  - `GET /users/{userId}`
  - `PATCH /users/{userId}`
  - `DELETE /users/{userId}`
- Gérer les salles
  - pas de route dédiée : routes de salles ouvertes aux administrateurs
  - `GET /rooms`, `POST /rooms`, `PATCH /rooms/{roomId}`, `DELETE /rooms/{roomId}`
  - `PUT /rooms/{roomId}/availability`
- Gérer les réservations
  - `GET /admin/reservations`
  - `GET /reservations/{reservationId}`
  - `POST /reservations/{reservationId}/confirm`
  - `POST /reservations/{reservationId}/reject`
- Consulter les statistiques
  - `GET /admin/statistics`

## Systèmes externes

- Système de paiement : reçoit « Payer la réservation » (`POST /payments`)
- Service de notification (email, SMS) : reçoit « Envoyer confirmation » et « Envoyer notification (annulation) », sans route exposée

## Routes hors diagramme

- `GET /auth/me` : profil de l'utilisateur connecté
- `PATCH /auth/password` : modifier son mot de passe

## Écarts

- Le gestionnaire n'a pas de route pour lister les réservations de ses salles : le contrat dit que `GET /reservations` ne renvoie que celles de l'utilisateur connecté, et `GET /admin/reservations` est réservé aux administrateurs. On suppose que `GET /reservations` renvoie les réservations de ses salles pour un `GESTIONNAIRE` (anomalie 4 de [`cadrage.md`](./cadrage.md#7-anomalies-du-contrat-et-contournements), à faire confirmer par le module Back-end).
