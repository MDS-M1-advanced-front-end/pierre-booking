// Point d'entrée unique vers les fonctions de `@room-booking/core` pour tout `src/data/`.
//
// L'import ci-dessous DOIT rester le premier : il installe l'enveloppe de `fetch` du mock
// (développement seulement) avant que `core` soit évalué, car openapi-fetch capture
// `globalThis.fetch` à la création de son client. Les imports ES sont évalués dans l'ordre où ils
// apparaissent : `./auth/mockPersona` (qui n'importe rien) l'est donc avant `@room-booking/core`.
import './auth/mockPersona';

export {
  setAccessToken,
  getAccessToken,
  // Authentification
  register,
  login,
  logout,
  getMe,
  changePassword,
  // Utilisateurs
  updateUser,
  // Salles et disponibilités
  searchRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomAvailability,
  setRoomAvailability,
  // Réservations
  listMyReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  confirmReservation,
  rejectReservation,
} from '@room-booking/core';

// API GraphQL du back-office : écrans qui croisent plusieurs ressources (écran 11 « Demandes »)
export { getReservationRequests } from '@room-booking/core/graphql';
